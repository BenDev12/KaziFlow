import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain-error';
import { Invite } from '../../domain/entities/invite.entity';
import { InviteRepository } from '../../domain/repositories/invite.repository.port';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationRepository } from '../../domain/repositories/organization.repository.port';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository.port';
import { Department } from '../../../departments/domain/entities/department.entity';
import { DepartmentRepository } from '../../../departments/domain/repositories/department.repository.port';
import { SendInviteEmailInput, EmailService } from '../ports/email.port';
import { CreateInviteUseCase } from './create-invite.use-case';

class FakeInviteRepository implements InviteRepository {
  private readonly byId = new Map<string, Invite>();

  async findById(id: string): Promise<Invite | null> {
    return this.byId.get(id) ?? null;
  }

  async findByToken(token: string): Promise<Invite | null> {
    return [...this.byId.values()].find((invite) => invite.token === token) ?? null;
  }

  async findPendingByOrgAndEmail(orgId: string, email: string): Promise<Invite | null> {
    return (
      [...this.byId.values()].find(
        (invite) =>
          invite.orgId === orgId &&
          invite.email === email.toLowerCase() &&
          invite.status === 'pending',
      ) ?? null
    );
  }

  async findByOrg(orgId: string): Promise<Invite[]> {
    return [...this.byId.values()].filter((invite) => invite.orgId === orgId);
  }

  async create(invite: Invite): Promise<Invite> {
    this.byId.set(invite.id, invite);
    return invite;
  }

  async save(invite: Invite): Promise<Invite> {
    this.byId.set(invite.id, invite);
    return invite;
  }
}

class FakeUserRepository implements UserRepository {
  constructor(private readonly users: User[] = []) {}

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

  async countInDepartment(departmentId: string): Promise<number> {
    return this.users.filter((user) => user.departmentId === departmentId).length;
  }
}

class FakeOrganizationRepository implements OrganizationRepository {
  constructor(private readonly org: Organization | null) {}

  async findById(id: string): Promise<Organization | null> {
    return this.org && this.org.id === id ? this.org : null;
  }

  async create(org: Organization): Promise<Organization> {
    return org;
  }
}

class FakeDepartmentRepository implements DepartmentRepository {
  constructor(private readonly departments: Department[] = []) {}

  async findById(id: string): Promise<Department | null> {
    return this.departments.find((d) => d.id === id) ?? null;
  }

  async findByIdUnscoped(id: string): Promise<Department | null> {
    return this.findById(id);
  }

  async findByName(name: string): Promise<Department | null> {
    return this.departments.find((d) => d.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  async findAll(): Promise<Department[]> {
    return this.departments;
  }

  async create(department: Department): Promise<Department> {
    this.departments.push(department);
    return department;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.departments.findIndex((d) => d.id === id);
    if (index === -1) return false;
    this.departments.splice(index, 1);
    return true;
  }
}

class FakeEmailService implements EmailService {
  public sent: SendInviteEmailInput[] = [];
  public shouldFail = false;

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    if (this.shouldFail) throw new Error('Resend is down');
    this.sent.push(input);
  }
}

describe('CreateInviteUseCase', () => {
  const org = Organization.create(
    { name: 'Acme', domain: 'acme.com', industry: 'Tech', timezone: 'UTC' },
    'org-1',
  );

  function build(opts?: { shouldFail?: boolean; departments?: Department[] }) {
    const invites = new FakeInviteRepository();
    const users = new FakeUserRepository();
    const organizations = new FakeOrganizationRepository(org);
    const departments = new FakeDepartmentRepository(opts?.departments ?? []);
    const emailService = new FakeEmailService();
    emailService.shouldFail = opts?.shouldFail ?? false;
    const useCase = new CreateInviteUseCase(
      invites,
      users,
      organizations,
      departments,
      emailService,
      { get: () => 'http://localhost:3000' } as never,
    );
    return { invites, users, organizations, departments, emailService, useCase };
  }

  it('creates a pending invite and emails it', async () => {
    const { useCase, emailService } = build();

    const invite = await useCase.execute({
      orgId: 'org-1',
      invitedByUserId: 'u-1',
      invitedByName: 'Jane Admin',
      invitedByRole: 'org_admin',
      email: 'new-agent@example.com',
      role: 'agent',
    });

    expect(invite.status).toBe('pending');
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0].to).toBe('new-agent@example.com');
  });

  it('rejects a manager inviting anything other than an agent', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({
        orgId: 'org-1',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Manager',
        invitedByRole: 'manager',
        email: 'new-admin@example.com',
        role: 'org_admin',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects inviting an email that already has an account', async () => {
    const { useCase, users } = build();
    await users.create(
      User.register(
        { email: 'existing@example.com', name: 'Existing', passwordHash: 'x' },
        'u-existing',
      ),
    );

    await expect(
      useCase.execute({
        orgId: 'org-1',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Admin',
        invitedByRole: 'org_admin',
        email: 'existing@example.com',
        role: 'agent',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('rejects a second invite while one is already pending for the same email', async () => {
    const { useCase } = build();
    await useCase.execute({
      orgId: 'org-1',
      invitedByUserId: 'u-1',
      invitedByName: 'Jane Admin',
      invitedByRole: 'org_admin',
      email: 'dup@example.com',
      role: 'agent',
    });

    await expect(
      useCase.execute({
        orgId: 'org-1',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Admin',
        invitedByRole: 'org_admin',
        email: 'dup@example.com',
        role: 'agent',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('throws if the org does not exist', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({
        orgId: 'missing-org',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Admin',
        invitedByRole: 'org_admin',
        email: 'x@example.com',
        role: 'agent',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('revokes the invite instead of leaving it stuck pending when the email fails to send', async () => {
    const { useCase, invites } = build({ shouldFail: true });

    await expect(
      useCase.execute({
        orgId: 'org-1',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Admin',
        invitedByRole: 'org_admin',
        email: 'undeliverable@example.com',
        role: 'agent',
      }),
    ).rejects.toThrow('Resend is down');

    const pending = await invites.findPendingByOrgAndEmail('org-1', 'undeliverable@example.com');
    expect(pending).toBeNull(); // not stuck — a retry must be possible
  });

  it('stores the department on the invite when one is given', async () => {
    const sales = Department.create({ orgId: 'org-1', name: 'Sales' }, 'dept-sales');
    const { useCase } = build({ departments: [sales] });

    const invite = await useCase.execute({
      orgId: 'org-1',
      invitedByUserId: 'u-1',
      invitedByName: 'Jane Admin',
      invitedByRole: 'org_admin',
      email: 'sales-agent@example.com',
      role: 'agent',
      departmentId: 'dept-sales',
    });

    expect(invite.departmentId).toBe('dept-sales');
  });

  it('rejects a department id that does not belong to this org', async () => {
    const foreignDept = Department.create({ orgId: 'org-2', name: 'Sales' }, 'dept-foreign');
    const { useCase } = build({ departments: [foreignDept] });

    await expect(
      useCase.execute({
        orgId: 'org-1',
        invitedByUserId: 'u-1',
        invitedByName: 'Jane Admin',
        invitedByRole: 'org_admin',
        email: 'x2@example.com',
        role: 'agent',
        departmentId: 'dept-foreign',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
