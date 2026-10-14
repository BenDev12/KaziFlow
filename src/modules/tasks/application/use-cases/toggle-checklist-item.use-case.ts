import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface ToggleChecklistItemInput {
  taskId: string;
  itemId: string;
  done: boolean;
  requestingUserId: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/** Same completion authority as CompleteTaskUseCase: assignee, this department's manager, or org_admin. */
@Injectable()
export class ToggleChecklistItemUseCase implements UseCase<ToggleChecklistItemInput, Task> {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(input: ToggleChecklistItemInput): Promise<Task> {
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

    const isAssignee = task.assignedToUserId === input.requestingUserId;
    const isDeptManager =
      input.requestingRole === 'manager' && input.requestingDepartmentId === task.departmentId;
    const isAdmin = input.requestingRole === 'org_admin';
    if (!isAssignee && !isDeptManager && !isAdmin) {
      throw new ForbiddenError(
        "Only the assignee or this department's manager can update the checklist",
      );
    }

    task.toggleChecklistItem(input.itemId, input.done);
    return this.tasks.save(task);
  }
}
