import { Entity } from '../../../../shared/domain/entity.base';
import { ConflictError } from '../../../../shared/domain/errors/domain-error';

export type PasswordResetStatus = 'pending' | 'used' | 'revoked';

const RESET_TTL_MINUTES = 60;

export interface PasswordResetTokenProps {
  userId: string;
  email: string;
  token: string;
  status: PasswordResetStatus;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * A one-time link to set a new password — not tenant-scoped through
 * BaseMongoRepository, because the reset flow looks this up by its opaque
 * `token` before the requester has any session/tenant context at all (same
 * reasoning as Invite/User — see their repositories). Short TTL relative to
 * Invite's 7 days, since this grants account takeover if leaked.
 */
export class PasswordResetToken extends Entity<PasswordResetTokenProps> {
  private constructor(props: PasswordResetTokenProps, id: string) {
    super(props, id);
  }

  static create(props: { userId: string; email: string; token: string }, id: string): PasswordResetToken {
    return new PasswordResetToken(
      {
        userId: props.userId,
        email: props.email.trim().toLowerCase(),
        token: props.token,
        status: 'pending',
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
        createdAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: PasswordResetTokenProps, id: string): PasswordResetToken {
    return new PasswordResetToken(props, id);
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  use(): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('This reset link is no longer valid');
    }
    if (this.isExpired()) {
      throw new ConflictError('This reset link has expired');
    }
    this.props.status = 'used';
  }

  /** A no-op past "pending" — called when superseding an old link with a fresh one. */
  revoke(): void {
    if (this.props.status !== 'pending') return;
    this.props.status = 'revoked';
  }

  get userId(): string {
    return this.props.userId;
  }

  get email(): string {
    return this.props.email;
  }

  get token(): string {
    return this.props.token;
  }

  get status(): PasswordResetStatus {
    return this.props.status;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
