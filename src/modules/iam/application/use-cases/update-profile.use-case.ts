import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository.port';

export interface UpdateProfileInput {
  userId: string;
  name: string;
}

export interface UpdateProfileOutput {
  userId: string;
  name: string;
}

@Injectable()
export class UpdateProfileUseCase implements UseCase<UpdateProfileInput, UpdateProfileOutput> {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundError('User', input.userId);

    user.updateName(input.name);
    const saved = await this.users.save(user);

    return { userId: saved.id, name: saved.name };
  }
}
