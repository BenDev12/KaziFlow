import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { UnauthorizedError } from '../../../../shared/domain/errors/domain-error';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
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

@Injectable()
export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const invalidCredentials = () => new UnauthorizedError('Invalid email or password');

    const user = await this.users.findByEmail(input.email);
    if (!user) throw invalidCredentials();

    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!passwordMatches) throw invalidCredentials();

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
