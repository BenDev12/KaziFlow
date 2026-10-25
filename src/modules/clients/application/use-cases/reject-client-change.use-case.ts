import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface RejectClientChangeInput {
  clientId: string;
  requestId: string;
  byId: string;
  byName: string;
  note: string | null;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class RejectClientChangeUseCase implements UseCase<RejectClientChangeInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: RejectClientChangeInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    const request = client.changeRequests.find((r) => r.id === input.requestId);
    if (!request) throw new NotFoundError('Change request', input.requestId);

    const isDeptManager =
      input.requestingRole === 'manager' &&
      input.requestingDepartmentId !== null &&
      input.requestingDepartmentId === request.requestedByDepartmentId;
    const isAdmin = input.requestingRole === 'org_admin';
    if (!isDeptManager && !isAdmin) {
      throw new ForbiddenError("Only the requester's department manager can reject this change");
    }

    client.rejectChange(input.requestId, { id: input.byId, name: input.byName }, input.note);
    return this.clients.save(client);
  }
}
