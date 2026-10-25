import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REALTIME_PUBLISHER,
  RealtimePublisher,
} from '../../../../shared/application/ports/realtime-publisher.port';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { TaskWorkflowPreviewService } from '../../application/services/task-workflow-preview.service';
import { Task } from '../../domain/entities/task.entity';
import { TaskListFilter, TaskRepository } from '../../domain/repositories/task.repository.port';
import { TaskMongoRepository } from '../../infrastructure/repositories/task.mongo.repository';
import { toTaskResponse } from '../presenters/task.presenter';

/**
 * TASK_REPOSITORY binding: delegates to TaskMongoRepository and pushes
 * every successful create/save out as a `task.created` / `task.updated`
 * realtime event. Hooking the repository rather than each use-case means
 * no write path can forget to broadcast — including the follow-up tasks
 * AdvanceWorkflowService spawns.
 *
 * Fire-and-forget, like InMemoryEventBus: a failed broadcast is logged,
 * never turned into a failed write.
 */
@Injectable()
export class RealtimeTaskRepository implements TaskRepository {
  private readonly logger = new Logger(RealtimeTaskRepository.name);

  constructor(
    private readonly inner: TaskMongoRepository,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisher,
    private readonly workflowPreview: TaskWorkflowPreviewService,
  ) {}

  findById(id: string): Promise<Task | null> {
    return this.inner.findById(id);
  }

  findAll(filter?: TaskListFilter): Promise<Task[]> {
    return this.inner.findAll(filter);
  }

  async create(task: Task): Promise<Task> {
    const created = await this.inner.create(task);
    this.broadcast('task.created', created);
    return created;
  }

  async save(task: Task): Promise<Task> {
    const saved = await this.inner.save(task);
    this.broadcast('task.updated', saved);
    return saved;
  }

  private broadcast(event: string, task: Task): void {
    const orgId = TenantContext.get().orgId;
    this.workflowPreview
      .nextStagesFor([task])
      .then((previews) =>
        this.publisher.publish({
          orgId,
          event,
          departmentId: task.departmentId,
          // Same widening as TaskListFilter.visibleToUserId — the original
          // requester follows their task through every department.
          userIds: [task.agentId],
          data: toTaskResponse(task, previews.get(task.id) ?? null),
        }),
      )
      .catch((error: unknown) =>
        this.logger.error(
          `Broadcasting "${event}" for task ${task.id} failed`,
          error instanceof Error ? error.stack : error,
        ),
      );
  }
}
