import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../../activities/domain/repositories/activity.repository.port';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import {
  FLAG_REPOSITORY,
  FlagRepository,
} from '../../../flags/domain/repositories/flag.repository.port';
import {
  ISSUE_REPOSITORY,
  IssueRepository,
} from '../../../issues/domain/repositories/issue.repository.port';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '../../../tasks/domain/repositories/task.repository.port';

export interface DashboardSummary {
  totalClients: number;
  overdueClients: number;
  openIssues: number;
  pendingTasks: number;
  openFlags: number;
  visitsLast30Days: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Read-only composition over the other bounded contexts' repository ports
 * — no new persistence of its own. In a modular monolith this is a plain
 * cross-module read; if this ever split into services, it becomes a
 * queries-fan-out (or a dedicated read-model) behind the same interface.
 */
@Injectable()
export class GetDashboardSummaryUseCase implements UseCase<void, DashboardSummary> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ISSUE_REPOSITORY) private readonly issues: IssueRepository,
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(FLAG_REPOSITORY) private readonly flags: FlagRepository,
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
  ) {}

  async execute(): Promise<DashboardSummary> {
    const [allClients, openIssues, pendingTasks, openFlags, recentActivities] = await Promise.all([
      this.clients.findAll(),
      this.issues.findAll({ status: 'open' }),
      this.tasks.findAll({ status: 'pending' }),
      this.flags.findAll({ status: 'open' }),
      this.activities.findAll({ from: new Date(Date.now() - THIRTY_DAYS_MS) }),
    ]);

    return {
      totalClients: allClients.length,
      overdueClients: allClients.filter((client) => client.isOverdue()).length,
      openIssues: openIssues.length,
      pendingTasks: pendingTasks.length,
      openFlags: openFlags.length,
      visitsLast30Days: recentActivities.length,
    };
  }
}
