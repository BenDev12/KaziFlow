import { DomainEvent } from '../../../../shared/domain/domain-event';

export class IssueResolvedEvent extends DomainEvent {
  readonly eventName = 'issue.resolved';

  constructor(
    orgId: string,
    readonly issueId: string,
    readonly clientId: string,
    readonly resolvedById: string,
  ) {
    super(orgId);
  }
}
