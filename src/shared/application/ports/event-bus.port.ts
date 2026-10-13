import { DomainEvent } from '../../domain/domain-event';

/**
 * Port for publishing domain events. The default binding is an in-process
 * bus (see shared/infrastructure/events); swapping to a real broker later
 * (e.g. RabbitMQ, Kafka, SNS) means rebinding this token in a module, not
 * touching any use-case.
 */
export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
