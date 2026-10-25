import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  RealtimeMessage,
  RealtimePublisher,
} from '../../application/ports/realtime-publisher.port';

/**
 * Default RealtimePublisher binding: a single in-process Subject every open
 * SSE connection subscribes to and filters for itself (see
 * RealtimeController). Only reaches clients connected to THIS process —
 * swap the REALTIME_PUBLISHER binding for a shared broker before scaling
 * past one instance.
 */
@Injectable()
export class InMemoryRealtimeHub implements RealtimePublisher {
  private readonly messages = new Subject<RealtimeMessage>();

  publish(message: RealtimeMessage): void {
    this.messages.next(message);
  }

  stream(): Observable<RealtimeMessage> {
    return this.messages.asObservable();
  }
}
