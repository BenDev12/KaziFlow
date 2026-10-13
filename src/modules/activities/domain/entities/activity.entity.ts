import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

export type ActivityType = 'office-visit' | 'phone-call' | 'lunch' | 'dinner' | 'site-tour';

export interface ActivityProps {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  activityType: ActivityType;
  personSpokenTo: string;
  notes: string;
  raisedIssue: boolean;
  createdTask: boolean;
  loggedAt: Date;
}

/** An append-only visit log — no update/delete in the UI, matching real-world audit expectations for field-rep activity. */
export class Activity extends Entity<ActivityProps> {
  private constructor(props: ActivityProps, id: string) {
    super(props, id);
  }

  static log(
    props: {
      clientId: string;
      clientName: string;
      agentId: string;
      agentName: string;
      activityType: ActivityType;
      personSpokenTo: string;
      notes: string;
      raisedIssue?: boolean;
      createdTask?: boolean;
    },
    id: string,
  ): Activity {
    if (!props.notes.trim()) throw new ValidationError('Visit notes are required');

    return new Activity(
      {
        ...props,
        notes: props.notes.trim(),
        personSpokenTo: props.personSpokenTo.trim(),
        raisedIssue: props.raisedIssue ?? false,
        createdTask: props.createdTask ?? false,
        loggedAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: ActivityProps, id: string): Activity {
    return new Activity(props, id);
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

  get activityType(): ActivityType {
    return this.props.activityType;
  }

  get personSpokenTo(): string {
    return this.props.personSpokenTo;
  }

  get notes(): string {
    return this.props.notes;
  }

  get raisedIssue(): boolean {
    return this.props.raisedIssue;
  }

  get createdTask(): boolean {
    return this.props.createdTask;
  }

  get loggedAt(): Date {
    return this.props.loggedAt;
  }
}
