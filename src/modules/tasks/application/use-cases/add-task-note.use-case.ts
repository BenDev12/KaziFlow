import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface AddTaskNoteInput {
  taskId: string;
  text: string;
  requestingUserId: string;
  requestingUserName: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

/**
 * Pure context, not a workflow gate — anyone who can already see the task
 * (same department-scoped visibility as the task list, org_admin included)
 * may add a note, at any status. No extra role check beyond that.
 */
@Injectable()
export class AddTaskNoteUseCase implements UseCase<AddTaskNoteInput, Task> {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(input: AddTaskNoteInput): Promise<Task> {
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

    task.addNote({
      id: randomUUID(),
      byId: input.requestingUserId,
      byName: input.requestingUserName,
      text: input.text,
    });
    return this.tasks.save(task);
  }
}
