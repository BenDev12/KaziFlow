import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Invite } from '../../domain/entities/invite.entity';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/repositories/invite.repository.port';

export interface ListInvitesInput {
  orgId: string;
}

@Injectable()
export class ListInvitesUseCase implements UseCase<ListInvitesInput, Invite[]> {
  constructor(@Inject(INVITE_REPOSITORY) private readonly invites: InviteRepository) {}

  async execute(input: ListInvitesInput): Promise<Invite[]> {
    return this.invites.findByOrg(input.orgId);
  }
}
