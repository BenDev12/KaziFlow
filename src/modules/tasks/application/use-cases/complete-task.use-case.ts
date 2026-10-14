import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext, UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';
import { AdvanceWorkflowService } from '../services/advance-workflow.service';

export interface CompleteTaskInput {
  taskId: string;
  byId: string;
  byName: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/**
 * Three parties can close a task out: the person it's assigned to, the
 * manager of the department that currently owns it, or org_admin (always).
 * A manager/admin closing it directly always finishes it outright — their
 * own authority already covers whatever a separate approval step would have
 * confirmed. Only the assignee's own completion is held for approval, and
 * only when the stage calls for it.
 */
@Injectable()
export class CompleteTaskUseCase implements UseCase<CompleteTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly advanceWorkflow: AdvanceWorkflowService,
  ) {}

  async execute(input: CompleteTaskInput): Promise<Task> {
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

    const isAssignee = task.assignedToUserId === input.byId;
    const isDeptManager =
      input.requestingRole === 'manager' && input.requestingDepartmentId === task.departmentId;
    const isAdmin = input.requestingRole === 'org_admin';

    if (!isAssignee && !isDeptManager && !isAdmin) {
      throw new ForbiddenError(
        "Only the assignee or this department's manager can complete this task",
      );
    }

    const orgId = TenantContext.get().orgId;

    if (task.requiresApproval && isAssignee && !isDeptManager && !isAdmin) {
      task.submitForApproval({ byId: input.byId, byName: input.byName });
      return this.tasks.save(task);
    }

    task.complete({ byId: input.byId, byName: input.byName, orgId });
    const saved = await this.tasks.save(task);

    await this.eventBus.publishAll(task.pullDomainEvents());
    await this.advanceWorkflow.advance(saved);

    return saved;
  }
}
