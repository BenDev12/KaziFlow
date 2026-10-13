import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface CompleteTaskInput {
  taskId: string;
  byId: string;
  byName: string;
}

@Injectable()
export class CompleteTaskUseCase implements UseCase<CompleteTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(input: CompleteTaskInput): Promise<Task> {
    const task = await this.tasks.findById(input.taskId);
    if (!task) throw new NotFoundError('Task', input.taskId);

    task.complete({ ...input, orgId: TenantContext.get().orgId });
    const saved = await this.tasks.save(task);

    await this.eventBus.publishAll(task.pullDomainEvents());
    return saved;
  }
}
