import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface SetClientRouteInput {
  clientId: string;
  routeId: string | null;
}

/** Whether the requester may make this change (own the target route, or manage) is the controller's job. */
@Injectable()
export class SetClientRouteUseCase implements UseCase<SetClientRouteInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: SetClientRouteInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    client.assignRoute(input.routeId);
    return this.clients.save(client);
  }
}
