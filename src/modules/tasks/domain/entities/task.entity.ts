import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain-error';
import { TaskCompletedEvent } from '../events/task-completed.event';

export type TaskStatus = 'pending' | 'completed';

export interface TaskProps {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  description: string;
  dueDate: Date | null;
  activityLogId: string;
  status: TaskStatus;
  completedById: string | null;
  completedByName: string | null;
  completedAt: Date | null;
}

export class Task extends AggregateRoot<TaskProps> {
  private constructor(props: TaskProps, id: string) {
    super(props, id);
  }

  static create(
    props: {
      clientId: string;
      clientName: string;
      agentId: string;
      agentName: string;
      description: string;
      dueDate?: Date | null;
      activityLogId: string;
    },
    id: string,
  ): Task {
    if (!props.description.trim()) throw new ValidationError('Task description is required');

    return new Task(
      {
        ...props,
        description: props.description.trim(),
        dueDate: props.dueDate ?? null,
        status: 'pending',
        completedById: null,
        completedByName: null,
        completedAt: null,
      },
      id,
    );
  }

  static reconstitute(props: TaskProps, id: string): Task {
    return new Task(props, id);
  }

  complete(input: { byId: string; byName: string; orgId: string }): void {
    if (this.props.status === 'completed') {
      throw new ConflictError('This task is already completed');
    }

    this.props.status = 'completed';
    this.props.completedById = input.byId;
    this.props.completedByName = input.byName;
    this.props.completedAt = new Date();

    this.addDomainEvent(
      new TaskCompletedEvent(input.orgId, this.id, this.props.clientId, input.byId),
    );
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get clientName(): string {
    return this.props.clientName;
  }

  get agentId(): string {
    return this.props.agentId;
  }

  get agentName(): string {
    return this.props.agentName;
  }

  get description(): string {
    return this.props.description;
  }

  get dueDate(): Date | null {
    return this.props.dueDate;
  }

  get activityLogId(): string {
    return this.props.activityLogId;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get completedById(): string | null {
    return this.props.completedById;
  }

  get completedByName(): string | null {
    return this.props.completedByName;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }
}
