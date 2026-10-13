import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '../clients/clients.module';
import { ACTIVITY_REPOSITORY } from './domain/repositories/activity.repository.port';
import { LogActivityUseCase } from './application/use-cases/log-activity.use-case';
import { ListActivitiesUseCase } from './application/use-cases/list-activities.use-case';
import { ActivityDocument, ActivitySchema } from './infrastructure/schemas/activity.schema';
import { ActivityMongoRepository } from './infrastructure/repositories/activity.mongo.repository';
import { ActivitiesController } from './interface/controllers/activities.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ActivityDocument.name, schema: ActivitySchema }]),
    ClientsModule,
  ],
  controllers: [ActivitiesController],
  providers: [
    { provide: ACTIVITY_REPOSITORY, useClass: ActivityMongoRepository },
    LogActivityUseCase,
    ListActivitiesUseCase,
  ],
  exports: [ACTIVITY_REPOSITORY],
})
export class ActivitiesModule {}
