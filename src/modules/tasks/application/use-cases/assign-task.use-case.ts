import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../iam/domain/repositories/user.repository.port';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface AssignTaskInput {
  taskId: string;
  assigneeUserId: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/**
 * A manager assigns a task to one of "their" people — assigning only ever
 * works within the manager's own department. org_admin can assign to
 * anyone, anywhere, as the standing override.
 */
@Injectable()
export class AssignTaskUseCase implements UseCase<AssignTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: AssignTaskInput): Promise<Task> {
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
      throw new ForbiddenError("Only this department's manager can assign this task");
    }

    const assignee = await this.users.findById(input.assigneeUserId);
    if (!assignee) throw new NotFoundError('User', input.assigneeUserId);

    if (!isAdmin && task.departmentId && assignee.departmentId !== task.departmentId) {
      throw new ValidationError(
        'A manager can only assign this task to a member of their own department',
      );
    }

    task.assign({ userId: assignee.id, userName: assignee.name });
    return this.tasks.save(task);
  }
}
