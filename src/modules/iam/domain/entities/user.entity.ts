import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

export interface UserProps {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  orgId: string | null;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id: string) {
    super(props, id);
  }

  /**
   * The account that signs up first becomes org_admin — the UI has no
   * invite/role-selection flow yet, and only an org_admin can run the
   * onboarding step that creates the organization.
   */
  static register(props: { email: string; name: string; passwordHash: string }, id: string): User {
    if (!props.name.trim()) throw new ValidationError('Name is required');
    return new User(
      {
        email: props.email.trim().toLowerCase(),
        name: props.name.trim(),
        passwordHash: props.passwordHash,
        role: 'org_admin',
        orgId: null,
      },
      id,
    );
  }

  static reconstitute(props: UserProps, id: string): User {
    return new User(props, id);
  }

  attachToOrganization(orgId: string): void {
    this.props.orgId = orgId;
  }

  updateName(name: string): void {
    if (!name.trim()) throw new ValidationError('Name is required');
    this.props.name = name.trim();
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get orgId(): string | null {
    return this.props.orgId;
  }
}
