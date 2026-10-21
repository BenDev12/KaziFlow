import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { departmentScopeFor } from '../../../../shared/application/department-scope';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Task } from '../../domain/entities/task.entity';
import {
  TASK_REPOSITORY,
  TaskListFilter,
  TaskRepository,
} from '../../domain/repositories/task.repository.port';

export interface ListTasksInput extends TaskListFilter {
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
  requestingUserId: string;
}

@Injectable()
export class ListTasksUseCase implements UseCase<ListTasksInput, Task[]> {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(input: ListTasksInput): Promise<Task[]> {
    const { requestingRole, requestingDepartmentId, requestingUserId, ...filter } = input;
    return this.tasks.findAll({
      ...filter,
      departmentId: departmentScopeFor(requestingRole, requestingDepartmentId),
      visibleToUserId: requestingUserId,
    });
  }
}
