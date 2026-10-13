import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Client, ClientPatch } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface UpdateClientInput {
  clientId: string;
  patch: ClientPatch;
}

@Injectable()
export class UpdateClientUseCase implements UseCase<UpdateClientInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: UpdateClientInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    client.applyPatch(input.patch);
    return this.clients.save(client);
  }
}
