import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';
import { AdvanceWorkflowService } from './advance-workflow.service';

const SWEEP_INTERVAL_MS = 60_000;
/** Give the request that finished the task time to do the hand-off itself first. */
const GRACE_PERIOD_MS = 60_000;
const BATCH_SIZE = 50;

/**
 * Safety net for workflow hand-offs. Completing/approving a workflow task
 * saves it with handoffPending=true, then creates the next stage's task(s)
 * and clears the flag. If the process dies (or the hand-off throws) between
 * those steps, the flag stays set — this finds such tasks once a minute and
 * runs the hand-off again. AdvanceWorkflowService is safe to repeat, so a
 * hand-off that half-happened is completed, never duplicated.
 */
@Injectable()
export class HandoffSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HandoffSweeperService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    private readonly advanceWorkflow: AdvanceWorkflowService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref(); // never keeps the process (or a test run) alive on its own
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(now: Date = new Date()): Promise<void> {
    if (this.running) return; // a slow sweep must not overlap the next tick
    this.running = true;
    try {
      const stuck = await this.tasks.findPendingHandoffsAcrossOrgs(
        new Date(now.getTime() - GRACE_PERIOD_MS),
        BATCH_SIZE,
      );
      for (const { orgId, task } of stuck) {
        try {
          // No user is behind this request — a system identity scoped to the
          // task's own org, so every repository call stays tenant-isolated.
          await TenantContext.run(
            { orgId, userId: 'system', role: 'org_admin', email: '', departmentId: null },
            () => this.advanceWorkflow.advance(task),
          );
          this.logger.warn(`Recovered an unfinished hand-off from task ${task.id} (org ${orgId})`);
        } catch (error) {
          this.logger.error(
            `Hand-off from task ${task.id} (org ${orgId}) failed again; will retry`,
            error instanceof Error ? error.stack : error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Hand-off sweep failed', error instanceof Error ? error.stack : error);
    } finally {
      this.running = false;
    }
  }
}
