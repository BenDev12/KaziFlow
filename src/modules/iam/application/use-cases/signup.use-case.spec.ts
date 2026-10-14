import { ConflictError } from '../../../../shared/domain/errors/domain-error';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenClaims, TokenPair, TokenService } from '../ports/token-service.port';
import { SignupUseCase } from './signup.use-case';

class FakeUserRepository implements UserRepository {
  private readonly usersByEmail = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return [...this.usersByEmail.values()].find((user) => user.id === id) ?? null;
  }

  async create(user: User): Promise<User> {
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async save(user: User): Promise<User> {
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async countInDepartment(departmentId: string): Promise<number> {
    return [...this.usersByEmail.values()].filter((user) => user.departmentId === departmentId)
      .length;
  }

  async findAllInOrg(orgId: string): Promise<User[]> {
    return [...this.usersByEmail.values()].filter((user) => user.orgId === orgId);
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class FakeTokenService implements TokenService {
  issueTokenPair(claims: TokenClaims): TokenPair {
    return { accessToken: `access:${claims.userId}`, refreshToken: `refresh:${claims.userId}` };
  }

  verifyRefreshToken(): TokenClaims {
    throw new Error('not used in this test');
  }
}

describe('SignupUseCase', () => {
  it('creates a new org-admin user and issues a token pair', async () => {
    const useCase = new SignupUseCase(
      new FakeUserRepository(),
      new FakePasswordHasher(),
      new FakeTokenService(),
    );

    const result = await useCase.execute({
      email: 'Jane@Example.com',
      password: 'super-secret',
      name: 'Jane Doe',
    });

    expect(result.email).toBe('jane@example.com');
    expect(result.role).toBe('org_admin');
    expect(result.orgSetupComplete).toBe(false);
    expect(result.tokens.accessToken).toContain('access:');
  });

  it('rejects signup with an email already in use', async () => {
    const users = new FakeUserRepository();
    const useCase = new SignupUseCase(users, new FakePasswordHasher(), new FakeTokenService());
    await useCase.execute({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane Doe',
    });

    await expect(
      useCase.execute({
        email: 'jane@example.com',
        password: 'another-secret',
        name: 'Jane Impostor',
      }),
    ).rejects.toThrow(ConflictError);
  });
});
