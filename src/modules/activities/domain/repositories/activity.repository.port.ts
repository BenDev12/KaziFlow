import { Activity } from '../entities/activity.entity';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface ActivityListFilter {
  clientId?: string;
  agentId?: string;
  from?: Date;
  to?: Date;
}

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  findAll(filter?: ActivityListFilter): Promise<Activity[]>;
  create(activity: Activity): Promise<Activity>;
}
