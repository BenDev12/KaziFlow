import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';
import { TaskNotificationsService } from './task-notifications.service';

/** Fixed namespace for deriving a spawned task's id from parent + stage (uuid v5). Never change it. */
const SPAWNED_TASK_ID_NAMESPACE = 'b3d0c1f2-7a4e-4c3b-9e2d-5f6a7b8c9d0e';

/**
 * Runs after a task finishes (complete() or approve()) — looks up its
 * template stage and spawns one brand-new task per `nextStageIds` entry.
 * Fan-out, not just a linear hand-off: a single finished stage can kick off
 * several separate follow-ups in different departments at once.
 *
 * Fails soft, not loud: a plain task (no templateId), a deleted template, or
 * a final stage (no next stages) all just mean "nothing to spawn" — none of
 * these should ever turn completing a task into a 500.
 *
 * Safe to run more than once for the same finished task: each spawned
 * task's id is derived from (parent, next stage), so a retry finds what an
 * earlier, interrupted run already created instead of duplicating it. The
 * parent's handoffPending flag is only cleared once every next task exists
 * — until then HandoffSweeperService keeps retrying.
 */

@Injectable()
export class AdvanceWorkflowService {
  private readonly logger = new Logger(AdvanceWorkflowService.name);

  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
    private readonly notifications: TaskNotificationsService,
  ) {}

  /**
   * For the request that just finished the task: the completion is already
   * saved, so a failed hand-off must not turn it into an error (retrying
   * "complete" would only say "already completed"). It's logged and left
   * flagged — HandoffSweeperService finishes it within a minute or two.
   */
  async advanceOrLeaveForSweeper(finishedTask: Task): Promise<void> {
    try {
      await this.advance(finishedTask);
    } catch (error) {
      this.logger.error(
        `Hand-off from task ${finishedTask.id} failed; the sweeper will retry it`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async advance(finishedTask: Task): Promise<Task[]> {
    const spawned = await this.spawnNextStages(finishedTask);
    if (finishedTask.handoffPending) await this.tasks.markHandoffDone(finishedTask.id);
    return spawned;
  }

  private async spawnNextStages(finishedTask: Task): Promise<Task[]> {
    if (!finishedTask.templateId || !finishedTask.stageId) return [];

    const template = await this.templates.findById(finishedTask.templateId);
    if (!template) return [];

    const stage = template.getStage(finishedTask.stageId);
    if (!stage || stage.nextStageIds.length === 0) return [];

    const spawned: Task[] = [];
    for (const nextStageId of stage.nextStageIds) {
      const nextStage = template.getStage(nextStageId);
      if (!nextStage) continue; // a dangling id shouldn't be possible (validated at template-create), but never crash a completion over it

      const id = uuidv5(`${finishedTask.id}:${nextStage.id}`, SPAWNED_TASK_ID_NAMESPACE);
      const alreadySpawned = await this.tasks.findById(id);
      if (alreadySpawned) {
        spawned.push(alreadySpawned);
        continue;
      }

      const newTask = Task.create(
        {
          clientId: finishedTask.clientId,
          clientName: finishedTask.clientName,
          // Provenance carries the ORIGINAL requester through the whole
          // chain — "agentId/agentName" means "who this is ultimately for,"
          // not "who clicked the button at this step."
          agentId: finishedTask.agentId,
          agentName: finishedTask.agentName,
          departmentId: nextStage.departmentId,
          title: nextStage.name,
          description: `Spawned from "${template.name}"`,
          activityLogId: null,
          templateId: template.id,
          stageId: nextStage.id,
          requiresApproval: nextStage.requiresApproval,
          checklistItems: nextStage.checklistTemplate.map((label) => ({
            id: randomUUID(),
            label,
            done: false,
          })),
          parentTaskId: finishedTask.id,
          // A visible starting point in this task's own history — who/what
          // finished the previous stage that handed this one off.
          history: [
            {
              id: randomUUID(),
              type: 'stage_advanced',
              byId: finishedTask.completedById ?? finishedTask.agentId,
              byName: finishedTask.completedByName ?? finishedTask.agentName,
              note: `Advanced from "${stage.name}"`,
              createdAt: new Date(),
            },
          ],
        },
        id,
      );
      const created = await this.tasks.create(newTask);
      void this.notifications.taskCreated(created);
      spawned.push(created);
    }
    return spawned;
  }
}
