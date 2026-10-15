import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface DeleteClientInput {
  clientId: string;
}

/** Whether the requester may reach this office at all is the controller's office-access gate. */
@Injectable()
export class DeleteClientUseCase implements UseCase<DeleteClientInput, void> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: DeleteClientInput): Promise<void> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    await this.clients.delete(input.clientId);
  }
}
