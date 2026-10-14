import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext, UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';
import { AdvanceWorkflowService } from '../services/advance-workflow.service';

export interface ApproveTaskInput {
  taskId: string;
  byId: string;
  byName: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/** Signs off on a task the assignee already submitted (see Task.submitForApproval). Manager-of-department or org_admin only. */
@Injectable()
export class ApproveTaskUseCase implements UseCase<ApproveTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly advanceWorkflow: AdvanceWorkflowService,
  ) {}

  async execute(input: ApproveTaskInput): Promise<Task> {
    const task = await this.tasks.findById(input.taskId);
    if (
      !task ||
      !canAccessDepartmentScopedRecord(
        task.departmentId,
        input.requestingRole,
        input.requestingDepartmentId,
      )
    ) {
      throw new NotFoundError('Task', input.taskId);
    }

    const isDeptManager =
      input.requestingRole === 'manager' && input.requestingDepartmentId === task.departmentId;
    const isAdmin = input.requestingRole === 'org_admin';
    if (!isDeptManager && !isAdmin) {
      throw new ForbiddenError("Only this department's manager can approve this task");
    }

    const orgId = TenantContext.get().orgId;
    task.approve({ byId: input.byId, byName: input.byName, orgId });
    const saved = await this.tasks.save(task);

    await this.eventBus.publishAll(task.pullDomainEvents());
    await this.advanceWorkflow.advance(saved);

    return saved;
  }
}
