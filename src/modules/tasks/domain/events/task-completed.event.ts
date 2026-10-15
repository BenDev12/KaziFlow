import { DomainEvent } from '../../../../shared/domain/domain-event';

export class TaskCompletedEvent extends DomainEvent {
  readonly eventName = 'task.completed';

  constructor(
    orgId: string,
    readonly taskId: string,
    readonly clientId: string | null,
    readonly completedById: string,
  ) {
    super(orgId);
  }
}
