import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';

export interface ListOrgMembersInput {
  orgId: string;
}

/** Every onboarded member of the org — source list for the task-assignment picker. */
@Injectable()
export class ListOrgMembersUseCase implements UseCase<ListOrgMembersInput, User[]> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: ListOrgMembersInput): Promise<User[]> {
    return this.users.findAllInOrg(input.orgId);
  }
}
