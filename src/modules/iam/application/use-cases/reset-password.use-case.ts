import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ResetPasswordOutput {
  orgSetupComplete: boolean;
  user: {
    email: string;
    name: string;
    role: string;
    orgName: string | null;
    departmentId: string | null;
  };
  tokens: TokenPair;
}

/** Resetting a password also signs the user in — same output shape as LoginUseCase. */
@Injectable()
export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, ResetPasswordOutput> {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY) private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const resetToken = await this.resetTokens.findByToken(input.token);
    if (!resetToken) throw new NotFoundError('Password reset link', input.token);

    // Checked before touching the user so a stale/replayed link never
    // changes a password twice.
    resetToken.use();
    await this.resetTokens.save(resetToken);

    const user = await this.users.findById(resetToken.userId);
    if (!user) throw new NotFoundError('User', resetToken.userId);

    const passwordHash = await this.passwordHasher.hash(input.password);
    user.resetPassword(passwordHash);
    await this.users.save(user);

    const org = user.orgId ? await this.organizations.findById(user.orgId) : null;

    const tokens = this.tokenService.issueTokenPair({
      userId: user.id,
      orgId: user.orgId ?? '',
      role: user.role,
      email: user.email,
      name: user.name,
      departmentId: user.departmentId,
    });

    return {
      orgSetupComplete: org?.setupComplete ?? false,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        orgName: org?.name ?? null,
        departmentId: user.departmentId,
      },
      tokens,
    };
  }
}
