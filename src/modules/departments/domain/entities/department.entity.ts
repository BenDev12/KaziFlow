import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

export interface DepartmentProps {
  orgId: string;
  name: string;
  createdAt: Date;
}

/**
 * An admin-defined team within an org (Sales, Finance, Operations, ...).
 * Tenant-scoped like any other domain resource — unlike User/Organization/
 * Invite, nothing needs to look a department up before the requester has a
 * tenant context, so this goes through BaseMongoRepository normally.
 */
export class Department extends Entity<DepartmentProps> {
  private constructor(props: DepartmentProps, id: string) {
    super(props, id);
  }

  static create(props: { orgId: string; name: string }, id: string): Department {
    if (!props.name.trim()) throw new ValidationError('Department name is required');
    return new Department(
      { orgId: props.orgId, name: props.name.trim(), createdAt: new Date() },
      id,
    );
  }

  static reconstitute(props: DepartmentProps, id: string): Department {
    return new Department(props, id);
  }

  get orgId(): string {
    return this.props.orgId;
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
