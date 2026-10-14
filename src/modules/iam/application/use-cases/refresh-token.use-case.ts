import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { UnauthorizedError } from '../../../../shared/domain/errors/domain-error';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface RefreshTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase implements UseCase<RefreshTokenInput, TokenPair> {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: RefreshTokenInput): Promise<TokenPair> {
    let claims;
    try {
      claims = this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Re-read the user so a role change or org attach since the refresh
    // token was issued is reflected in the new access token immediately.
    const user = await this.users.findById(claims.userId);
    if (!user) throw new UnauthorizedError('Invalid or expired refresh token');

    return this.tokenService.issueTokenPair({
      userId: user.id,
      orgId: user.orgId ?? '',
      role: user.role,
      email: user.email,
      name: user.name,
      departmentId: user.departmentId,
    });
  }
}
