import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext, UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';
import { AdvanceWorkflowService } from '../services/advance-workflow.service';
import { TaskNotificationsService } from '../services/task-notifications.service';

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
 * `requiresApproval` applies uniformly to whoever calls this — including a
 * manager or admin completing their own work — so a stage that calls for
 * approval always goes through submit-then-approve, with no role-based
 * bypass. The manager/admin's authority shows up at the *approve* step
 * instead (see ApproveTaskUseCase), where they can approve a submission of
 * their own — a deliberate second click, not a silent skip.
 */
@Injectable()
export class CompleteTaskUseCase implements UseCase<CompleteTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly advanceWorkflow: AdvanceWorkflowService,
    private readonly notifications: TaskNotificationsService,
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

    if (task.requiresApproval) {
      task.submitForApproval({ byId: input.byId, byName: input.byName, historyId: randomUUID() });
      const submitted = await this.tasks.save(task);
      void this.notifications.submittedForApproval(submitted);
      return submitted;
    }

    task.complete({ byId: input.byId, byName: input.byName, orgId, historyId: randomUUID() });
    const saved = await this.tasks.save(task);

    await this.eventBus.publishAll(task.pullDomainEvents());
    await this.advanceWorkflow.advanceOrLeaveForSweeper(saved);

    return saved;
  }
}
