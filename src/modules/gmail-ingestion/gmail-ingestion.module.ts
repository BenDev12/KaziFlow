import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IamModule } from '../iam/iam.module';
import { TasksModule } from '../tasks/tasks.module';
import { GmailIngestionService } from './application/services/gmail-ingestion.service';
import { CompleteGmailConnectionUseCase } from './application/use-cases/complete-gmail-connection.use-case';
import { DisconnectGmailIntegrationUseCase } from './application/use-cases/disconnect-gmail-integration.use-case';
import { GetGmailIntegrationUseCase } from './application/use-cases/get-gmail-integration.use-case';
import { StartGmailConnectionUseCase } from './application/use-cases/start-gmail-connection.use-case';
import { UpdateGmailIntegrationSettingsUseCase } from './application/use-cases/update-gmail-integration-settings.use-case';
import { GMAIL_INTEGRATION_REPOSITORY } from './domain/repositories/gmail-integration.repository.port';
import { GmailIntegrationMongoRepository } from './infrastructure/repositories/gmail-integration.mongo.repository';
import {
  GmailIntegrationDocument,
  GmailIntegrationSchema,
} from './infrastructure/schemas/gmail-integration.schema';
import {
  ProcessedGmailMessageDocument,
  ProcessedGmailMessageSchema,
} from './infrastructure/schemas/processed-gmail-message.schema';
import { GmailIntegrationController } from './interface/controllers/gmail-integration.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProcessedGmailMessageDocument.name, schema: ProcessedGmailMessageSchema },
      { name: GmailIntegrationDocument.name, schema: GmailIntegrationSchema },
    ]),
    IamModule,
    TasksModule,
  ],
  controllers: [GmailIntegrationController],
  providers: [
    GmailIngestionService,
    { provide: GMAIL_INTEGRATION_REPOSITORY, useClass: GmailIntegrationMongoRepository },
    GetGmailIntegrationUseCase,
    StartGmailConnectionUseCase,
    CompleteGmailConnectionUseCase,
    UpdateGmailIntegrationSettingsUseCase,
    DisconnectGmailIntegrationUseCase,
  ],
})
export class GmailIngestionModule {}
