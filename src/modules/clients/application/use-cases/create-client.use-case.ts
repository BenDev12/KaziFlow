import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { CallCycle, Client, ClientPriority, VisitTimeSlot } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface CreateClientInput {
  name: string;
  contact: string;
  phone: string;
  callCycle: CallCycle;
  address: string;
  industry?: string;
  priority?: ClientPriority;
  // Loose shape (role/phone optional, not required-null) so the DTO — which
  // can't express "string | null" over the wire, only "present or absent" —
  // satisfies this type directly. Client.create() normalizes undefined to
  // null when building the actual entity.
  contacts?: { id: string; name: string; role?: string | null; phone?: string | null }[];
  preferredVisitTime?: VisitTimeSlot;
}

@Injectable()
export class CreateClientUseCase implements UseCase<CreateClientInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: CreateClientInput): Promise<Client> {
    const client = Client.create(input, randomUUID());
    return this.clients.create(client);
  }
}
