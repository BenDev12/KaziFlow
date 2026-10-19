import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { EMAIL_SERVICE, EmailService } from '../ports/email.port';

export interface RequestPasswordResetInput {
  email: string;
}

/**
 * Whether this silently no-ops (no account with that email) or actually
 * sends a link is never exposed to the caller — see AuthController, which
 * returns the same response either way so this endpoint can't be used to
 * enumerate registered emails.
 */
@Injectable()
export class RequestPasswordResetUseCase implements UseCase<RequestPasswordResetInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY) private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user) return;

    // Revoke any links already out there for this user before issuing a
    // fresh one, so an old leaked link stops working.
    const pending = await this.resetTokens.findPendingByUserId(user.id);
    for (const p of pending) {
      p.revoke();
      await this.resetTokens.save(p);
    }

    const token = randomBytes(32).toString('hex');
    const resetToken = PasswordResetToken.create(
      { userId: user.id, email: user.email, token },
      randomUUID(),
    );
    const saved = await this.resetTokens.create(resetToken);

    const resetUrl = `${this.config.get<string>('CORS_ORIGIN')}/reset-password?token=${token}`;
    try {
      await this.emailService.sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (error) {
      // Don't leave an undeliverable link stuck "pending" — see create-invite.use-case.ts.
      saved.revoke();
      await this.resetTokens.save(saved);
      throw error;
    }
  }
}
