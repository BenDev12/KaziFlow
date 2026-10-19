import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

export interface UserProps {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  orgId: string | null;
  departmentId: string | null;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id: string) {
    super(props, id);
  }

  /**
   * Self-service signup: the account that signs up this way always becomes
   * org_admin, because only an org_admin can run the onboarding step that
   * creates the organization in the first place. Everyone else joins an
   * existing org via `registerFromInvite`. org_admin is never
   * department-scoped (it always sees the whole org — see
   * shared/application/department-scope.ts), so it has no department.
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
        departmentId: null,
      },
      id,
    );
  }

  /** Accepting an invite: role, org and department are fixed by the invite, not self-selected. */
  static registerFromInvite(
    props: {
      email: string;
      name: string;
      passwordHash: string;
      role: UserRole;
      orgId: string;
      departmentId: string | null;
    },
    id: string,
  ): User {
    if (!props.name.trim()) throw new ValidationError('Name is required');
    return new User(
      {
        email: props.email.trim().toLowerCase(),
        name: props.name.trim(),
        passwordHash: props.passwordHash,
        role: props.role,
        orgId: props.orgId,
        departmentId: props.departmentId,
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

  assignDepartment(departmentId: string | null): void {
    this.props.departmentId = departmentId;
  }

  updateName(name: string): void {
    if (!name.trim()) throw new ValidationError('Name is required');
    this.props.name = name.trim();
  }

  resetPassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
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

  get departmentId(): string | null {
    return this.props.departmentId;
  }
}
