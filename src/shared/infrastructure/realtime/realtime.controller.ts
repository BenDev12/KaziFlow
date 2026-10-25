import { Controller, Header, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EMPTY, Observable, filter, interval, map, merge, takeUntil, timer } from 'rxjs';
import { canAccessDepartmentScopedRecord } from '../../application/department-scope';
import { CurrentUser } from '../../interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../interface/guards/require-org.guard';
import { JwtPayload } from '../tenancy/jwt-payload.interface';
import { InMemoryRealtimeHub } from './in-memory-realtime-hub';

/** Keeps proxies/load balancers from closing an idle connection. */
const HEARTBEAT_MS = 25_000;

/**
 * One long-lived Server-Sent Events stream per signed-in tab, carrying
 * task.* and issue.* events (payloads are the same shape the REST endpoints
 * return). Auth is the same access-token cookie as every other route —
 * open it with `new EventSource('/v1/realtime', { withCredentials: true })`.
 *
 * The stream ends when the access token it was opened with expires, so a
 * revoked/changed role or department can't keep receiving events forever.
 * The client should refresh its token and reconnect when that happens.
 */
@ApiTags('realtime')
@Controller('v1/realtime')
@UseGuards(JwtAuthGuard, RequireOrgGuard)
export class RealtimeController {
  constructor(private readonly hub: InMemoryRealtimeHub) {}

  @Sse()
  @Header('X-Accel-Buffering', 'no')
  stream(@CurrentUser() user: JwtPayload & { exp?: number }): Observable<MessageEvent> {
    const events = this.hub.stream().pipe(
      filter(
        (message) =>
          message.orgId === user.orgId &&
          (canAccessDepartmentScopedRecord(message.departmentId, user.role, user.departmentId) ||
            (message.userIds ?? []).includes(user.sub)),
      ),
      map((message): MessageEvent => ({ type: message.event, data: message.data })),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: {} })),
    );
    const expiry = user.exp ? timer(Math.max(user.exp * 1000 - Date.now(), 0)) : EMPTY;

    return merge(events, heartbeat).pipe(takeUntil(expiry));
  }
}
