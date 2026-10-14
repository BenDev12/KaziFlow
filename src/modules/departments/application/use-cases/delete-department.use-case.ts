import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../iam/domain/repositories/user.repository.port';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../domain/repositories/department.repository.port';

export interface DeleteDepartmentInput {
  departmentId: string;
}

@Injectable()
export class DeleteDepartmentUseCase implements UseCase<DeleteDepartmentInput, void> {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: DeleteDepartmentInput): Promise<void> {
    const department = await this.departments.findById(input.departmentId);
    if (!department) throw new NotFoundError('Department', input.departmentId);

    // Records tagged with this department (clients, tasks, ...) fall back to
    // "visible to everyone" once it's gone — see department-scope.ts — so
    // this never corrupts data, but we still block it to force a deliberate
    // reassignment step rather than silently widening everyone's visibility.
    const memberCount = await this.users.countInDepartment(input.departmentId);
    if (memberCount > 0) {
      throw new ConflictError(
        `Cannot delete "${department.name}" — ${memberCount} member(s) are still assigned to it`,
      );
    }

    await this.departments.delete(input.departmentId);
  }
}
