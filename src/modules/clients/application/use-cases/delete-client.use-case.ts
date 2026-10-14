import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { canAccessDepartmentScopedRecord } from '../../../../shared/application/department-scope';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';

export interface DeleteClientInput {
  clientId: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
}

@Injectable()
export class DeleteClientUseCase implements UseCase<DeleteClientInput, void> {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(input: DeleteClientInput): Promise<void> {
    const client = await this.clients.findById(input.clientId);
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

    await this.clients.delete(input.clientId);
  }
}
