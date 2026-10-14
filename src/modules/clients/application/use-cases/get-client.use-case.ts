import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface GetClientInput {
  clientId: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class GetClientUseCase implements UseCase<GetClientInput, Client> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: GetClientInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    // A client in a different department reports as not-found, same as a
    // genuinely missing id — never confirm a record exists that the
    // requester isn't allowed to see.
    if (
      !client ||
      !canAccessDepartmentScopedRecord(
        client.departmentId,
        input.requestingRole,
        input.requestingDepartmentId,
      )
    ) {
      throw new NotFoundError('Client', input.clientId);
    }
    return client;
  }
}
