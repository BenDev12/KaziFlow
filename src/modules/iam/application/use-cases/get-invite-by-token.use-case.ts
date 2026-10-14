import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../../departments/domain/repositories/department.repository.port';
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
  departmentName: string | null;
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
    @Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository,
  ) {}

  async execute(input: GetInviteByTokenInput): Promise<InvitePreview> {
    const invite = await this.invites.findByToken(input.token);
    if (!invite) throw new NotFoundError('Invite', input.token);

    const org = await this.organizations.findById(invite.orgId);
    // Unscoped — this runs with no tenant context (the invitee isn't
    // authenticated yet), so the normal tenant-scoped findById would throw.
    const department = invite.departmentId
      ? await this.departments.findByIdUnscoped(invite.departmentId)
      : null;

    return {
      email: invite.email,
      role: invite.role,
      orgName: org?.name ?? 'this organization',
      departmentName: department?.name ?? null,
      invitedByName: invite.invitedByName,
      status: invite.status === 'pending' && invite.isExpired() ? 'expired' : invite.status,
    };
  }
}
