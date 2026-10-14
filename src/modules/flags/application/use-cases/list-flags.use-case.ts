import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { departmentScopeFor } from '../../../../shared/application/department-scope';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Flag } from '../../domain/entities/flag.entity';
import {
  FLAG_REPOSITORY,
  FlagListFilter,
  FlagRepository,
} from '../../domain/repositories/flag.repository.port';

export interface ListFlagsInput extends FlagListFilter {
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class ListFlagsUseCase implements UseCase<ListFlagsInput, Flag[]> {
  constructor(@Inject(FLAG_REPOSITORY) private readonly flags: FlagRepository) {}

  async execute(input: ListFlagsInput): Promise<Flag[]> {
    const { requestingRole, requestingDepartmentId, ...filter } = input;
    return this.flags.findAll({
      ...filter,
      departmentId: departmentScopeFor(requestingRole, requestingDepartmentId),
    });
  }
}
