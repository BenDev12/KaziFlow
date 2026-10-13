import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/repositories/invite.repository.port';

export interface GetInviteByTokenInput {
  token: string;
}

export interface InvitePreview {
  email: string;
  role: UserRole;
  orgName: string;
  invitedByName: string;
  /** 'expired' is derived, not a stored status, so the UI can say something friendlier than 404. */
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

/** Public lookup (no auth) — the invitee has no session yet when they open this link. */
@Injectable()
export class GetInviteByTokenUseCase implements UseCase<GetInviteByTokenInput, InvitePreview> {
  constructor(
    @Inject(INVITE_REPOSITORY) private readonly invites: InviteRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
  ) {}

  async execute(input: GetInviteByTokenInput): Promise<InvitePreview> {
    const invite = await this.invites.findByToken(input.token);
    if (!invite) throw new NotFoundError('Invite', input.token);

    const org = await this.organizations.findById(invite.orgId);

    return {
      email: invite.email,
      role: invite.role,
      orgName: org?.name ?? 'this organization',
      invitedByName: invite.invitedByName,
      status: invite.status === 'pending' && invite.isExpired() ? 'expired' : invite.status,
    };
  }
}
