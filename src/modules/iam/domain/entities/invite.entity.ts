import { Entity } from '../../../../shared/domain/entity.base';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

const INVITE_TTL_DAYS = 7;

export interface InviteProps {
  orgId: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  token: string;
  status: InviteStatus;
  invitedByUserId: string;
  invitedByName: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * A pending membership offer for an org — not tenant-scoped through
 * BaseMongoRepository, because the accept flow looks an invite up by its
 * opaque `token` before the invitee has any session/tenant context at all
 * (same reasoning as User/Organization — see their repositories).
 */
export class Invite extends Entity<InviteProps> {
  private constructor(props: InviteProps, id: string) {
    super(props, id);
  }

  static create(
    props: {
      orgId: string;
      email: string;
      role: UserRole;
      departmentId: string | null;
      token: string;
      invitedByUserId: string;
      invitedByName: string;
    },
    id: string,
  ): Invite {
    if (!props.email.trim()) throw new ValidationError('Email is required');

    return new Invite(
      {
        orgId: props.orgId,
        email: props.email.trim().toLowerCase(),
        role: props.role,
        departmentId: props.departmentId,
        token: props.token,
        status: 'pending',
        invitedByUserId: props.invitedByUserId,
        invitedByName: props.invitedByName,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: InviteProps, id: string): Invite {
    return new Invite(props, id);
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  accept(): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('This invite is no longer pending');
    }
    if (this.isExpired()) {
      throw new ConflictError('This invite has expired');
    }
    this.props.status = 'accepted';
  }

  revoke(): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('This invite is no longer pending');
    }
    this.props.status = 'revoked';
  }

  get orgId(): string {
    return this.props.orgId;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get departmentId(): string | null {
    return this.props.departmentId;
  }

  get token(): string {
    return this.props.token;
  }

  get status(): InviteStatus {
    return this.props.status;
  }

  get invitedByUserId(): string {
    return this.props.invitedByUserId;
  }

  get invitedByName(): string {
    return this.props.invitedByName;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
