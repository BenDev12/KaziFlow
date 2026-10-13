import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Invite } from '../../domain/entities/invite.entity';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/repositories/invite.repository.port';

export interface RevokeInviteInput {
  inviteId: string;
  orgId: string;
}

@Injectable()
export class RevokeInviteUseCase implements UseCase<RevokeInviteInput, Invite> {
  constructor(@Inject(INVITE_REPOSITORY) private readonly invites: InviteRepository) {}

  async execute(input: RevokeInviteInput): Promise<Invite> {
    const invite = await this.invites.findById(input.inviteId);
    // orgId mismatch is reported the same as not-found — never leak that an
    // invite id exists in a different tenant.
    if (!invite || invite.orgId !== input.orgId) {
      throw new NotFoundError('Invite', input.inviteId);
    }

    invite.revoke();
    return this.invites.save(invite);
  }
}
