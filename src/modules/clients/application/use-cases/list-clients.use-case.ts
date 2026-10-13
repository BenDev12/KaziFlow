import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientListFilter,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface ClientListItem {
  client: Client;
  overdue: boolean;
}

@Injectable()
export class ListClientsUseCase implements UseCase<ClientListFilter | undefined, ClientListItem[]> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(filter?: ClientListFilter): Promise<ClientListItem[]> {
    const clients = await this.clients.findAll(filter);
    return clients.map((client) => ({ client, overdue: client.isOverdue() }));
  }
}
