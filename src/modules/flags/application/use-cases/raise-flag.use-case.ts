import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import { Flag, FlagType } from '../../domain/entities/flag.entity';
import { FLAG_REPOSITORY, FlagRepository } from '../../domain/repositories/flag.repository.port';

export interface RaiseFlagInput {
  clientId: string;
  agentId: string;
  agentName: string;
  departmentId: string | null;
  flagType: FlagType;
  visitNote: string;
  personSpokenTo: string;
  activityLogId: string;
}

@Injectable()
export class RaiseFlagUseCase implements UseCase<RaiseFlagInput, Flag> {
  constructor(
    @Inject(FLAG_REPOSITORY) private readonly flags: FlagRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(input: RaiseFlagInput): Promise<Flag> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    const flag = Flag.raise(
      { ...input, clientId: client.id, clientName: client.name },
      randomUUID(),
    );
    return this.flags.create(flag);
  }
}
