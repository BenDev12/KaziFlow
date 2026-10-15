import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface RecordClientVisitInput {
  clientId: string;
  notes?: string;
  visitDate?: Date;
}

/**
 * Exposes Client.recordVisit() — what actually moves an office from
 * "pending" to "active" and refreshes its last-visit banner. Whether the
 * requester may reach this office at all is the controller's office-access gate.
 */
@Injectable()
export class RecordClientVisitUseCase implements UseCase<RecordClientVisitInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: RecordClientVisitInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    // Empty/omitted notes keep whatever was logged on the previous visit,
    // rather than blanking a field the agent just didn't touch this time.
    client.recordVisit(input.visitDate ?? new Date(), input.notes?.trim() || (client.lastNotes ?? ''));
    return this.clients.save(client);
  }
}
