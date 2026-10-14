import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Organization } from '../../domain/entities/organization.entity';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../../domain/repositories/organization.repository.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../ports/token-service.port';

export interface CreateOrganizationInput {
  requestingUserId: string;
  name: string;
  domain: string;
  industry: string;
  timezone: string;
}

export interface CreateOrganizationOutput {
  orgId: string;
  tokens: TokenPair;
}

/** The onboarding step: the signed-up-but-orgless user creates their org and is attached as its first member. */
@Injectable()
export class CreateOrganizationUseCase implements UseCase<
  CreateOrganizationInput,
  CreateOrganizationOutput
> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    const user = await this.users.findById(input.requestingUserId);
    if (!user) throw new NotFoundError('User', input.requestingUserId);
    if (user.orgId) throw new ConflictError('This account is already attached to an organization');

    const org = Organization.create(
      {
        name: input.name,
        domain: input.domain,
        industry: input.industry,
        timezone: input.timezone,
      },
      randomUUID(),
    );
    const savedOrg = await this.organizations.create(org);

    user.attachToOrganization(savedOrg.id);
    const savedUser = await this.users.save(user);

    const tokens = this.tokenService.issueTokenPair({
      userId: savedUser.id,
      orgId: savedOrg.id,
      role: savedUser.role,
      email: savedUser.email,
      name: savedUser.name,
      departmentId: savedUser.departmentId,
    });

    return { orgId: savedOrg.id, tokens };
  }
}
