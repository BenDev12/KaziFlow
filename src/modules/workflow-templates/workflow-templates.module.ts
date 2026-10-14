import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WORKFLOW_TEMPLATE_REPOSITORY } from './domain/repositories/workflow-template.repository.port';
import { CreateWorkflowTemplateUseCase } from './application/use-cases/create-workflow-template.use-case';
import { DeleteWorkflowTemplateUseCase } from './application/use-cases/delete-workflow-template.use-case';
import { ListWorkflowTemplatesUseCase } from './application/use-cases/list-workflow-templates.use-case';
import {
  WorkflowTemplateDocument,
  WorkflowTemplateSchema,
} from './infrastructure/schemas/workflow-template.schema';
import { WorkflowTemplateMongoRepository } from './infrastructure/repositories/workflow-template.mongo.repository';
import { WorkflowTemplatesController } from './interface/controllers/workflow-templates.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowTemplateDocument.name, schema: WorkflowTemplateSchema },
    ]),
  ],
  controllers: [WorkflowTemplatesController],
  providers: [
    { provide: WORKFLOW_TEMPLATE_REPOSITORY, useClass: WorkflowTemplateMongoRepository },
    CreateWorkflowTemplateUseCase,
    ListWorkflowTemplatesUseCase,
    DeleteWorkflowTemplateUseCase,
  ],
  exports: [WORKFLOW_TEMPLATE_REPOSITORY],
})
export class WorkflowTemplatesModule {}
