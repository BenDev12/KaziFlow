import { Entity } from './entity.base';
import { DomainEvent } from './domain-event';

/**
 * An Entity that accumulates DomainEvents as it changes state. Use-cases
 * pull events off via pullDomainEvents() after a successful repository
 * save and publish them through the EventBus port — infrastructure never
 * decides *what* happened, only the aggregate does.
 */
export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }
}
