export abstract class DomainEvent {
  abstract readonly eventName: string;
  readonly occurredAt: Date = new Date();
  readonly orgId: string;

  protected constructor(orgId: string) {
    this.orgId = orgId;
  }
}
