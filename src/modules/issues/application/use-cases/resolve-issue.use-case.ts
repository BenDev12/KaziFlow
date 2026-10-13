import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Issue } from '../../domain/entities/issue.entity';
import { ISSUE_REPOSITORY, IssueRepository } from '../../domain/repositories/issue.repository.port';

export interface ResolveIssueInput {
  issueId: string;
  note: string;
  byId: string;
  byName: string;
}

@Injectable()
export class ResolveIssueUseCase implements UseCase<ResolveIssueInput, Issue> {
  constructor(
    @Inject(ISSUE_REPOSITORY) private readonly issues: IssueRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(input: ResolveIssueInput): Promise<Issue> {
    const issue = await this.issues.findById(input.issueId);
    if (!issue) throw new NotFoundError('Issue', input.issueId);

    issue.resolve({ ...input, orgId: TenantContext.get().orgId });
    const saved = await this.issues.save(issue);

    await this.eventBus.publishAll(issue.pullDomainEvents());
    return saved;
  }
}
