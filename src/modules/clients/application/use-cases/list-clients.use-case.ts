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

/**
 * Who may call this at all is decided one layer up, by the controller's
 * office-access gate (see office-access.ts) — everyone who passes it sees
 * the whole org's offices, since offices belong to the sales/field team as
 * a whole, not to whichever department the viewer happens to be in.
 */
export type ListClientsInput = ClientListFilter;

@Injectable()
export class ListClientsUseCase implements UseCase<ListClientsInput, ClientListItem[]> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: ListClientsInput): Promise<ClientListItem[]> {
    const clients = await this.clients.findAll(input);
    return clients.map((client) => ({ client, overdue: client.isOverdue() }));
  }
}
