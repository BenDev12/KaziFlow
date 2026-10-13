import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Invite } from '../../domain/entities/invite.entity';
import { InviteRepository } from '../../domain/repositories/invite.repository.port';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationRepository } from '../../domain/repositories/organization.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenClaims, TokenPair, TokenService } from '../ports/token-service.port';
import { AcceptInviteUseCase } from './accept-invite.use-case';

class FakeInviteRepository implements InviteRepository {
  constructor(private readonly invites: Invite[] = []) {}

  async findById(id: string): Promise<Invite | null> {
    return this.invites.find((invite) => invite.id === id) ?? null;
  }

  async findByToken(token: string): Promise<Invite | null> {
    return this.invites.find((invite) => invite.token === token) ?? null;
  }

  async findPendingByOrgAndEmail(orgId: string, email: string): Promise<Invite | null> {
    return (
      this.invites.find(
        (invite) =>
          invite.orgId === orgId &&
          invite.email === email.toLowerCase() &&
          invite.status === 'pending',
      ) ?? null
    );
  }

  async findByOrg(orgId: string): Promise<Invite[]> {
    return this.invites.filter((invite) => invite.orgId === orgId);
  }

  async create(invite: Invite): Promise<Invite> {
    this.invites.push(invite);
    return invite;
  }

  async save(invite: Invite): Promise<Invite> {
    return invite;
  }
}

class FakeUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async save(user: User): Promise<User> {
    return user;
  }
}

class FakeOrganizationRepository implements OrganizationRepository {
  constructor(private readonly org: Organization) {}

  async findById(id: string): Promise<Organization | null> {
    return this.org.id === id ? this.org : null;
  }

  async create(org: Organization): Promise<Organization> {
    return org;
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

describe('AcceptInviteUseCase', () => {
  const org = Organization.create(
    { name: 'Acme', domain: 'acme.com', industry: 'Tech', timezone: 'UTC' },
    'org-1',
  );

  function pendingInvite(overrides?: Partial<Parameters<typeof Invite.create>[0]>) {
    return Invite.create(
      {
        orgId: 'org-1',
        email: 'invitee@example.com',
        role: 'agent',
        token: 'tok-123',
        invitedByUserId: 'u-admin',
        invitedByName: 'Jane Admin',
        ...overrides,
      },
      randomUUID(),
    );
  }

  function build(invites: Invite[]) {
    const inviteRepo = new FakeInviteRepository(invites);
    const userRepo = new FakeUserRepository();
    const orgRepo = new FakeOrganizationRepository(org);
    const useCase = new AcceptInviteUseCase(
      inviteRepo,
      userRepo,
      orgRepo,
      new FakePasswordHasher(),
      new FakeTokenService(),
    );
    return { useCase, inviteRepo, userRepo };
  }

  it('creates a user with the role and org fixed by the invite, and issues tokens', async () => {
    const { useCase, userRepo } = build([pendingInvite()]);

    const result = await useCase.execute({
      token: 'tok-123',
      name: 'New Agent',
      password: 'super-secret-1',
    });

    expect(result.orgId).toBe('org-1');
    expect(result.orgName).toBe('Acme');
    expect(result.role).toBe('agent');
    expect(result.tokens.accessToken).toContain('access:');

    const created = await userRepo.findByEmail('invitee@example.com');
    expect(created?.role).toBe('agent');
    expect(created?.orgId).toBe('org-1');
  });

  it('rejects an unknown token', async () => {
    const { useCase } = build([]);

    await expect(
      useCase.execute({ token: 'does-not-exist', name: 'X', password: 'super-secret-1' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects accepting the same invite twice', async () => {
    const invite = pendingInvite();
    const { useCase } = build([invite]);

    await useCase.execute({ token: 'tok-123', name: 'New Agent', password: 'super-secret-1' });

    await expect(
      useCase.execute({ token: 'tok-123', name: 'New Agent', password: 'super-secret-1' }),
    ).rejects.toThrow(ConflictError);
  });
});
