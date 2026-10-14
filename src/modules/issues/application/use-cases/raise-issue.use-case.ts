import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import { Issue } from '../../domain/entities/issue.entity';
import { ISSUE_REPOSITORY, IssueRepository } from '../../domain/repositories/issue.repository.port';

export interface RaiseIssueInput {
  clientId: string;
  agentId: string;
  agentName: string;
  departmentId: string | null;
  description: string;
  visitNote: string;
  activityLogId: string;
}

@Injectable()
export class RaiseIssueUseCase implements UseCase<RaiseIssueInput, Issue> {
  constructor(
    @Inject(ISSUE_REPOSITORY) private readonly issues: IssueRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(input: RaiseIssueInput): Promise<Issue> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    const issue = Issue.raise(
      { ...input, clientId: client.id, clientName: client.name },
      randomUUID(),
    );
    return this.issues.create(issue);
  }
}
