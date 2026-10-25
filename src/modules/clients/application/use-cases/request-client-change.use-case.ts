import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  Client,
  ClientChangeRequestPatch,
  ClientChangeRequestType,
} from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface RequestClientChangeInput {
  clientId: string;
  type: ClientChangeRequestType;
  patch: ClientChangeRequestPatch;
  requestedById: string;
  requestedByName: string;
  requestedByDepartmentId: string | null;
}

/**
 * Queues a contacts/visit-preferences edit instead of applying it — see
 * Client.requestChange. Who's allowed to call this (vs. going straight to
 * UpdateClientUseCase) is a controller-level decision based on role, not
 * enforced here: this use case only knows how to queue a request.
 */
@Injectable()
export class RequestClientChangeUseCase implements UseCase<RequestClientChangeInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: RequestClientChangeInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    client.requestChange({
      id: randomUUID(),
      type: input.type,
      patch: input.patch,
      requestedById: input.requestedById,
      requestedByName: input.requestedByName,
      requestedByDepartmentId: input.requestedByDepartmentId,
    });
    return this.clients.save(client);
  }
}
