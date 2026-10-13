import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { EventBus } from '../../application/ports/event-bus.port';
import { DomainEvent } from '../../domain/domain-event';

/**
 * Default EventBus binding: an in-process EventEmitter. Handlers run
 * fire-and-forget (errors are logged, never bubbled into the request that
 * triggered the event) so a slow/broken subscriber can't fail the write
 * that published it. Replace the binding in EVENT_BUS's provider (not the
 * call sites) to move to a real broker later.
 */
@Injectable()
export class InMemoryEventBus implements EventBus {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(InMemoryEventBus.name);

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
  ): void {
    this.emitter.on(eventName, (event: T) => {
      Promise.resolve(handler(event)).catch((error: unknown) =>
        this.logger.error(
          `Handler for "${eventName}" failed`,
          error instanceof Error ? error.stack : error,
        ),
      );
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    this.emitter.emit(event.eventName, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
