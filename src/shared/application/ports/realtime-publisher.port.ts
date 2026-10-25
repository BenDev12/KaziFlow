/**
 * Port for pushing live updates to connected clients. The default binding
 * is an in-process hub (see shared/infrastructure/realtime) that fans out
 * over Server-Sent Events — fine for a single instance. Running more than
 * one instance means rebinding this token to something shared (e.g. Redis
 * pub/sub), not touching any publisher.
 */
export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');

export interface RealtimeMessage {
  orgId: string;
  /** SSE event name the client listens for, e.g. "task.updated". */
  event: string;
  /**
   * Same visibility rule as the list endpoints (see department-scope.ts):
   * org_admin always receives it, everyone else only when this matches
   * their own department or is null.
   */
  departmentId: string | null;
  /** Widens (never narrows) the audience to these users regardless of department. */
  userIds?: string[];
  data: object;
}

export interface RealtimePublisher {
  publish(message: RealtimeMessage): void;
}
