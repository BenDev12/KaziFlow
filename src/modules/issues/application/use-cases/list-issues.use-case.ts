import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Issue } from '../../domain/entities/issue.entity';
import {
  ISSUE_REPOSITORY,
  IssueListFilter,
  IssueRepository,
} from '../../domain/repositories/issue.repository.port';

@Injectable()
export class ListIssuesUseCase implements UseCase<IssueListFilter | undefined, Issue[]> {
  constructor(@Inject(ISSUE_REPOSITORY) private readonly issues: IssueRepository) {}

  async execute(filter?: IssueListFilter): Promise<Issue[]> {
    return this.issues.findAll(filter);
  }
}
