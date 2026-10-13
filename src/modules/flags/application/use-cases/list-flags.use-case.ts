import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Flag } from '../../domain/entities/flag.entity';
import {
  FLAG_REPOSITORY,
  FlagListFilter,
  FlagRepository,
} from '../../domain/repositories/flag.repository.port';

@Injectable()
export class ListFlagsUseCase implements UseCase<FlagListFilter | undefined, Flag[]> {
  constructor(@Inject(FLAG_REPOSITORY) private readonly flags: FlagRepository) {}

  async execute(filter?: FlagListFilter): Promise<Flag[]> {
    return this.flags.findAll(filter);
  }
}
