import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Invite } from '../../domain/entities/invite.entity';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/repositories/invite.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { EMAIL_SERVICE, EmailService } from '../ports/email.port';

export interface CreateInviteInput {
  orgId: string;
  invitedByUserId: string;
  invitedByName: string;
  /** The requester's own role — governs which roles they're allowed to hand out. */
  invitedByRole: UserRole;
  email: string;
  role: UserRole;
}

@Injectable()
export class CreateInviteUseCase implements UseCase<CreateInviteInput, Invite> {
  constructor(
    @Inject(INVITE_REPOSITORY) private readonly invites: InviteRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: CreateInviteInput): Promise<Invite> {
    // A manager can grow the team but not create peers/admins above themselves.
    if (input.invitedByRole === 'manager' && input.role !== 'agent') {
      throw new ForbiddenError('Managers can only invite agents');
    }

    const org = await this.organizations.findById(input.orgId);
    if (!org) throw new NotFoundError('Organization', input.orgId);

    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError(`An account with email "${input.email}" already exists`);
    }

    const existingInvite = await this.invites.findPendingByOrgAndEmail(input.orgId, input.email);
    if (existingInvite) {
      throw new ConflictError(`An invite is already pending for "${input.email}"`);
    }

    const token = randomBytes(32).toString('hex');
    const invite = Invite.create(
      {
        orgId: input.orgId,
        email: input.email,
        role: input.role,
        token,
        invitedByUserId: input.invitedByUserId,
        invitedByName: input.invitedByName,
      },
      randomUUID(),
    );
    const saved = await this.invites.create(invite);

    const acceptUrl = `${this.config.get<string>('CORS_ORIGIN')}/accept-invite?token=${token}`;
    try {
      await this.emailService.sendInviteEmail({
        to: saved.email,
        orgName: org.name,
        inviterName: saved.invitedByName,
        role: saved.role,
        acceptUrl,
      });
    } catch (error) {
      // Don't leave an undeliverable invite stuck in "pending" — it would
      // otherwise block every retry via the findPendingByOrgAndEmail check
      // above, with no way for the admin to clear it short of DB access.
      saved.revoke();
      await this.invites.save(saved);
      throw error;
    }

    return saved;
  }
}
