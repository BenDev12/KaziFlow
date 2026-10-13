import { Issue, IssueStatus } from '../entities/issue.entity';

export const ISSUE_REPOSITORY = Symbol('ISSUE_REPOSITORY');

export interface IssueListFilter {
  status?: IssueStatus;
  clientId?: string;
}

export interface IssueRepository {
  findById(id: string): Promise<Issue | null>;
  findAll(filter?: IssueListFilter): Promise<Issue[]>;
  create(issue: Issue): Promise<Issue>;
  save(issue: Issue): Promise<Issue>;
}
