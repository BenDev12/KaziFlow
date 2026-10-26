import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { FlagsModule } from './modules/flags/flags.module';
import { GmailIngestionModule } from './modules/gmail-ingestion/gmail-ingestion.module';
import { IamModule } from './modules/iam/iam.module';
import { IssuesModule } from './modules/issues/issues.module';
import { RoutesModule } from './modules/routes/routes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkflowTemplatesModule } from './modules/workflow-templates/workflow-templates.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { EventsModule } from './shared/infrastructure/events/events.module';
import { RealtimeModule } from './shared/infrastructure/realtime/realtime.module';
import { buildPinoConfig } from './shared/infrastructure/logging/pino.config';
import { TenancyModule } from './shared/infrastructure/tenancy/tenancy.module';
import { TenantContextMiddleware } from './shared/infrastructure/tenancy/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({ inject: [ConfigService], useFactory: buildPinoConfig }),
    DatabaseModule,
    EventsModule,
    RealtimeModule,
    TenancyModule,
    HealthModule,
    IamModule,
    DepartmentsModule,
    ClientsModule,
    RoutesModule,
    ActivitiesModule,
    IssuesModule,
    WorkflowTemplatesModule,
    TasksModule,
    FlagsModule,
    AnalyticsModule,
    GmailIngestionModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
