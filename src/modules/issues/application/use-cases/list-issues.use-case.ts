import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { departmentScopeFor } from '../../../../shared/application/department-scope';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Issue } from '../../domain/entities/issue.entity';
import {
  ISSUE_REPOSITORY,
  IssueListFilter,
  IssueRepository,
} from '../../domain/repositories/issue.repository.port';

export interface ListIssuesInput extends IssueListFilter {
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class ListIssuesUseCase implements UseCase<ListIssuesInput, Issue[]> {
  constructor(@Inject(ISSUE_REPOSITORY) private readonly issues: IssueRepository) {}

  async execute(input: ListIssuesInput): Promise<Issue[]> {
    const { requestingRole, requestingDepartmentId, ...filter } = input;
    return this.issues.findAll({
      ...filter,
      departmentId: departmentScopeFor(requestingRole, requestingDepartmentId),
    });
  }
}
