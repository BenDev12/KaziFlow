import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError } from '../../../../shared/domain/errors/domain-error';
import { Department } from '../../domain/entities/department.entity';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../domain/repositories/department.repository.port';

export interface CreateDepartmentInput {
  orgId: string;
  name: string;
}

@Injectable()
export class CreateDepartmentUseCase implements UseCase<CreateDepartmentInput, Department> {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository) {}

  async execute(input: CreateDepartmentInput): Promise<Department> {
    const existing = await this.departments.findByName(input.name);
    if (existing) {
      throw new ConflictError(`A department named "${input.name}" already exists`);
    }

    const department = Department.create({ orgId: input.orgId, name: input.name }, randomUUID());
    return this.departments.create(department);
  }
}
