import { DomainEvent } from '../../../../shared/domain/domain-event';

export class FlagResolvedEvent extends DomainEvent {
  readonly eventName = 'flag.resolved';

  constructor(
    orgId: string,
    readonly flagId: string,
    readonly clientId: string,
    readonly resolvedById: string,
  ) {
    super(orgId);
  }
}
