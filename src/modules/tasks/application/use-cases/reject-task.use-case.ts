import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface RejectTaskInput {
  taskId: string;
  byId: string;
  byName: string;
  reason: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/** Sends a submitted task back to the assignee with a reason. Same authorization as approve — manager-of-department or org_admin only. */
@Injectable()
export class RejectTaskUseCase implements UseCase<RejectTaskInput, Task> {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(input: RejectTaskInput): Promise<Task> {
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
      throw new ForbiddenError("Only this department's manager can reject this task");
    }

    task.reject({
      byId: input.byId,
      byName: input.byName,
      reason: input.reason,
      historyId: randomUUID(),
    });
    return this.tasks.save(task);
  }
}
