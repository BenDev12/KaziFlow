import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { EVENT_BUS, EventBus } from '../../../../shared/application/ports/event-bus.port';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Flag } from '../../domain/entities/flag.entity';
import { FLAG_REPOSITORY, FlagRepository } from '../../domain/repositories/flag.repository.port';

export interface ResolveFlagInput {
  flagId: string;
  note: string;
  byId: string;
  byName: string;
}

@Injectable()
export class ResolveFlagUseCase implements UseCase<ResolveFlagInput, Flag> {
  constructor(
    @Inject(FLAG_REPOSITORY) private readonly flags: FlagRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(input: ResolveFlagInput): Promise<Flag> {
    const flag = await this.flags.findById(input.flagId);
    if (!flag) throw new NotFoundError('Flag', input.flagId);

    flag.resolve({ ...input, orgId: TenantContext.get().orgId });
    const saved = await this.flags.save(flag);

    await this.eventBus.publishAll(flag.pullDomainEvents());
    return saved;
  }
}
