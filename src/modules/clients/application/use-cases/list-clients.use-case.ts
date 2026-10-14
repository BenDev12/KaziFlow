import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { departmentScopeFor } from '../../../../shared/application/department-scope';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
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

export interface ListClientsInput extends ClientListFilter {
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class ListClientsUseCase implements UseCase<ListClientsInput, ClientListItem[]> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: ListClientsInput): Promise<ClientListItem[]> {
    const { requestingRole, requestingDepartmentId, ...filter } = input;
    const clients = await this.clients.findAll({
      ...filter,
      departmentId: departmentScopeFor(requestingRole, requestingDepartmentId),
    });
    return clients.map((client) => ({ client, overdue: client.isOverdue() }));
  }
}
