import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { User } from '../../domain/entities/user.entity';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/repositories/invite.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInviteOutput {
  orgId: string;
  orgName: string;
  role: string;
  tokens: TokenPair;
}

@Injectable()
export class AcceptInviteUseCase implements UseCase<AcceptInviteInput, AcceptInviteOutput> {
  constructor(
    @Inject(INVITE_REPOSITORY) private readonly invites: InviteRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: AcceptInviteInput): Promise<AcceptInviteOutput> {
    const invite = await this.invites.findByToken(input.token);
    if (!invite) throw new NotFoundError('Invite', input.token);

    // Checked before touching the users collection so a stale link never
    // creates an orphan user.
    if (invite.status !== 'pending') {
      throw new ConflictError('This invite is no longer pending');
    }
    if (invite.isExpired()) {
      throw new ConflictError('This invite has expired');
    }

    const existingUser = await this.users.findByEmail(invite.email);
    if (existingUser) {
      throw new ConflictError(`An account with email "${invite.email}" already exists`);
    }

    const org = await this.organizations.findById(invite.orgId);
    if (!org) throw new NotFoundError('Organization', invite.orgId);

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.registerFromInvite(
      {
        email: invite.email,
        name: input.name,
        passwordHash,
        role: invite.role,
        orgId: invite.orgId,
        departmentId: invite.departmentId,
      },
      randomUUID(),
    );
    const savedUser = await this.users.create(user);

    invite.accept();
    await this.invites.save(invite);

    const tokens = this.tokenService.issueTokenPair({
      userId: savedUser.id,
      orgId: savedUser.orgId ?? '',
      role: savedUser.role,
      email: savedUser.email,
      name: savedUser.name,
      departmentId: savedUser.departmentId,
    });

    return { orgId: org.id, orgName: org.name, role: savedUser.role, tokens };
  }
}
