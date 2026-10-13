import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ClientsModule } from './modules/clients/clients.module';
import { FlagsModule } from './modules/flags/flags.module';
import { IamModule } from './modules/iam/iam.module';
import { IssuesModule } from './modules/issues/issues.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { EventsModule } from './shared/infrastructure/events/events.module';
import { buildPinoConfig } from './shared/infrastructure/logging/pino.config';
import { TenancyModule } from './shared/infrastructure/tenancy/tenancy.module';
import { TenantContextMiddleware } from './shared/infrastructure/tenancy/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({ inject: [ConfigService], useFactory: buildPinoConfig }),
    DatabaseModule,
    EventsModule,
    TenancyModule,
    HealthModule,
    IamModule,
    ClientsModule,
    ActivitiesModule,
    IssuesModule,
    TasksModule,
    FlagsModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
