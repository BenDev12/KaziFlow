import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Activity } from '../../domain/entities/activity.entity';
import {
  ACTIVITY_REPOSITORY,
  ActivityListFilter,
  ActivityRepository,
} from '../../domain/repositories/activity.repository.port';

@Injectable()
export class ListActivitiesUseCase implements UseCase<ActivityListFilter | undefined, Activity[]> {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository) {}

  async execute(filter?: ActivityListFilter): Promise<Activity[]> {
    return this.activities.findAll(filter);
  }
}
