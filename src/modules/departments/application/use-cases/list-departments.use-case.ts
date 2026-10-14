import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Department } from '../../domain/entities/department.entity';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../domain/repositories/department.repository.port';

@Injectable()
export class ListDepartmentsUseCase implements UseCase<void, Department[]> {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository) {}

  async execute(): Promise<Department[]> {
    return this.departments.findAll();
  }
}
