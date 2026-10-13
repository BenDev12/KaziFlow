import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError } from '../../../../shared/domain/errors/domain-error';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export interface SignupOutput {
  userId: string;
  email: string;
  name: string;
  role: string;
  orgSetupComplete: boolean;
  tokens: TokenPair;
}

@Injectable()
export class SignupUseCase implements UseCase<SignupInput, SignupOutput> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: SignupInput): Promise<SignupOutput> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`An account with email "${input.email}" already exists`);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.register(
      { email: input.email, name: input.name, passwordHash },
      randomUUID(),
    );
    const saved = await this.users.create(user);

    const tokens = this.tokenService.issueTokenPair({
      userId: saved.id,
      orgId: saved.orgId ?? '',
      role: saved.role,
      email: saved.email,
      name: saved.name,
    });

    return {
      userId: saved.id,
      email: saved.email,
      name: saved.name,
      role: saved.role,
      orgSetupComplete: false,
      tokens,
    };
  }
}
