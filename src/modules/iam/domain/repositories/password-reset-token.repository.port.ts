import { PasswordResetToken } from '../entities/password-reset-token.entity';

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

export interface PasswordResetTokenRepository {
  /** Deliberately global, like Invite.findByToken — the reset flow has no tenant context yet. */
  findByToken(token: string): Promise<PasswordResetToken | null>;
  /** Used to revoke any still-pending links before issuing a fresh one. */
  findPendingByUserId(userId: string): Promise<PasswordResetToken[]>;
  create(resetToken: PasswordResetToken): Promise<PasswordResetToken>;
  save(resetToken: PasswordResetToken): Promise<PasswordResetToken>;
}
