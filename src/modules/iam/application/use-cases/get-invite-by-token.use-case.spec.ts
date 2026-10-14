import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Department } from '../../../departments/domain/entities/department.entity';
import { DepartmentRepository } from '../../../departments/domain/repositories/department.repository.port';
import { Invite } from '../../domain/entities/invite.entity';
import { InviteRepository } from '../../domain/repositories/invite.repository.port';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationRepository } from '../../domain/repositories/organization.repository.port';
import { GetInviteByTokenUseCase } from './get-invite-by-token.use-case';

class FakeInviteRepository implements InviteRepository {
  constructor(private readonly invites: Invite[] = []) {}

  async findById(id: string): Promise<Invite | null> {
    return this.invites.find((invite) => invite.id === id) ?? null;
  }

  async findByToken(token: string): Promise<Invite | null> {
    return this.invites.find((invite) => invite.token === token) ?? null;
  }

  async findPendingByOrgAndEmail(): Promise<Invite | null> {
    return null;
  }

  async findByOrg(): Promise<Invite[]> {
    return this.invites;
  }

  async create(invite: Invite): Promise<Invite> {
    this.invites.push(invite);
    return invite;
  }

  async save(invite: Invite): Promise<Invite> {
    return invite;
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

/**
 * `findById` throws — standing in for what BaseMongoRepository's real
 * findOneScoped() does with no TenantContext active, exactly the situation
 * this public, pre-auth use-case runs in. Only `findByIdUnscoped` is safe
 * to call here; this fake makes sure the use-case actually does.
 */
class FakeDepartmentRepository implements DepartmentRepository {
  constructor(private readonly departments: Department[] = []) {}

  async findById(): Promise<Department | null> {
    throw new Error('No tenant context is present for this operation');
  }

  async findByIdUnscoped(id: string): Promise<Department | null> {
    return this.departments.find((d) => d.id === id) ?? null;
  }

  async findByName(): Promise<Department | null> {
    throw new Error('not used in this test');
  }

  async findAll(): Promise<Department[]> {
    return this.departments;
  }

  async create(department: Department): Promise<Department> {
    this.departments.push(department);
    return department;
  }

  async delete(): Promise<boolean> {
    throw new Error('not used in this test');
  }
}

describe('GetInviteByTokenUseCase', () => {
  const org = Organization.create(
    { name: 'Acme', domain: 'acme.com', industry: 'Tech', timezone: 'UTC' },
    'org-1',
  );

  function build(opts?: { departments?: Department[] }) {
    const invite = Invite.create(
      {
        orgId: 'org-1',
        email: 'invitee@example.com',
        role: 'manager',
        departmentId: 'dept-sales',
        token: 'tok-123',
        invitedByUserId: 'u-admin',
        invitedByName: 'Jane Admin',
      },
      randomUUID(),
    );
    const useCase = new GetInviteByTokenUseCase(
      new FakeInviteRepository([invite]),
      new FakeOrganizationRepository(org),
      new FakeDepartmentRepository(opts?.departments ?? []),
    );
    return { useCase };
  }

  it('resolves the department name without requiring tenant context', async () => {
    const sales = Department.create({ orgId: 'org-1', name: 'Sales' }, 'dept-sales');
    const { useCase } = build({ departments: [sales] });

    const preview = await useCase.execute({ token: 'tok-123' });

    expect(preview.departmentName).toBe('Sales');
    expect(preview.orgName).toBe('Acme');
    expect(preview.status).toBe('pending');
  });

  it('returns null departmentName when the invite has no department', async () => {
    const invite = Invite.create(
      {
        orgId: 'org-1',
        email: 'invitee2@example.com',
        role: 'agent',
        departmentId: null,
        token: 'tok-456',
        invitedByUserId: 'u-admin',
        invitedByName: 'Jane Admin',
      },
      randomUUID(),
    );
    const useCase = new GetInviteByTokenUseCase(
      new FakeInviteRepository([invite]),
      new FakeOrganizationRepository(org),
      new FakeDepartmentRepository([]),
    );

    const preview = await useCase.execute({ token: 'tok-456' });

    expect(preview.departmentName).toBeNull();
  });

  it('throws if the token does not exist', async () => {
    const { useCase } = build();

    await expect(useCase.execute({ token: 'does-not-exist' })).rejects.toThrow(NotFoundError);
  });
});
