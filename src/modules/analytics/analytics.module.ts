import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ClientsModule } from '../clients/clients.module';
import { FlagsModule } from '../flags/flags.module';
import { IssuesModule } from '../issues/issues.module';
import { TasksModule } from '../tasks/tasks.module';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';
import { AnalyticsController } from './interface/controllers/analytics.controller';

@Module({
  imports: [ClientsModule, IssuesModule, TasksModule, FlagsModule, ActivitiesModule],
  controllers: [AnalyticsController],
  providers: [GetDashboardSummaryUseCase],
})
export class AnalyticsModule {}
