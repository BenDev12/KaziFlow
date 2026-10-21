import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain-error';
import { IssueResolvedEvent } from '../events/issue-resolved.event';

export type IssueStatus = 'open' | 'resolved';

export interface IssueProps {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  /** The creating agent's department at the time — see shared/application/department-scope.ts. */
  departmentId: string | null;
  description: string;
  visitNote: string;
  activityLogId: string;
  status: IssueStatus;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export class Issue extends AggregateRoot<IssueProps> {
  private constructor(props: IssueProps, id: string) {
    super(props, id);
  }

  static raise(
    props: {
      clientId: string;
      clientName: string;
      agentId: string;
      agentName: string;
      departmentId: string | null;
      description: string;
      visitNote: string;
      activityLogId: string;
    },
    id: string,
  ): Issue {
    if (!props.description.trim()) throw new ValidationError('Issue description is required');

    return new Issue(
      {
        ...props,
        description: props.description.trim(),
        status: 'open',
        resolutionNote: null,
        resolvedById: null,
        resolvedByName: null,
        resolvedAt: null,
        createdAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: IssueProps, id: string): Issue {
    return new Issue(props, id);
  }

  /** `orgId` is supplied by the use-case (from TenantContext) — the entity stays free of ambient/framework reads. */
  resolve(input: { note: string; byId: string; byName: string; orgId: string }): void {
    if (this.props.status === 'resolved') {
      throw new ConflictError('This issue is already resolved');
    }

    this.props.status = 'resolved';
    this.props.resolutionNote = input.note.trim();
    this.props.resolvedById = input.byId;
    this.props.resolvedByName = input.byName;
    this.props.resolvedAt = new Date();

    this.addDomainEvent(
      new IssueResolvedEvent(input.orgId, this.id, this.props.clientId, input.byId),
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

  get departmentId(): string | null {
    return this.props.departmentId;
  }

  get description(): string {
    return this.props.description;
  }

  get visitNote(): string {
    return this.props.visitNote;
  }

  get activityLogId(): string {
    return this.props.activityLogId;
  }

  get status(): IssueStatus {
    return this.props.status;
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

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
