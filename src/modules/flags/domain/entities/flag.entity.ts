import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain-error';
import { FlagResolvedEvent } from '../events/flag-resolved.event';

/**
 * "routine" is deliberately excluded — it is the non-flaggable default
 * outcome of a visit and never produces a Flag record. Priority order
 * (highest first) mirrors the UI: complaint > executive_visit >
 * close_opportunity > payment_collection > follow_up > new_contact.
 */
export type FlagType =
  | 'complaint'
  | 'executive_visit'
  | 'close_opportunity'
  | 'payment_collection'
  | 'follow_up'
  | 'new_contact';

export type FlagStatus = 'open' | 'resolved';

export interface FlagProps {
  activityLogId: string;
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  flagType: FlagType;
  status: FlagStatus;
  visitNote: string;
  personSpokenTo: string;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: Date | null;
}

export class Flag extends AggregateRoot<FlagProps> {
  private constructor(props: FlagProps, id: string) {
    super(props, id);
  }

  static raise(
    props: {
      activityLogId: string;
      clientId: string;
      clientName: string;
      agentId: string;
      agentName: string;
      flagType: FlagType;
      visitNote: string;
      personSpokenTo: string;
    },
    id: string,
  ): Flag {
    return new Flag(
      {
        ...props,
        visitNote: props.visitNote.trim(),
        personSpokenTo: props.personSpokenTo.trim(),
        status: 'open',
        resolutionNote: null,
        resolvedById: null,
        resolvedByName: null,
        resolvedAt: null,
      },
      id,
    );
  }

  static reconstitute(props: FlagProps, id: string): Flag {
    return new Flag(props, id);
  }

  resolve(input: { note: string; byId: string; byName: string; orgId: string }): void {
    if (this.props.status === 'resolved') {
      throw new ConflictError('This flag is already resolved');
    }
    if (!input.note.trim()) {
      throw new ValidationError('A resolution note is required');
    }

    this.props.status = 'resolved';
    this.props.resolutionNote = input.note.trim();
    this.props.resolvedById = input.byId;
    this.props.resolvedByName = input.byName;
    this.props.resolvedAt = new Date();

    this.addDomainEvent(
      new FlagResolvedEvent(input.orgId, this.id, this.props.clientId, input.byId),
    );
  }

  get activityLogId(): string {
    return this.props.activityLogId;
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

  get flagType(): FlagType {
    return this.props.flagType;
  }

  get status(): FlagStatus {
    return this.props.status;
  }

  get visitNote(): string {
    return this.props.visitNote;
  }

  get personSpokenTo(): string {
    return this.props.personSpokenTo;
  }

  get resolutionNote(): string | null {
    return this.props.resolutionNote;
  }

  get resolvedById(): string | null {
    return this.props.resolvedById;
  }

  get resolvedByName(): string | null {
    return this.props.resolvedByName;
  }

  get resolvedAt(): Date | null {
    return this.props.resolvedAt;
  }
}
