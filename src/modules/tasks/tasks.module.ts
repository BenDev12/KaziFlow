import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '../clients/clients.module';
import { IamModule } from '../iam/iam.module';
import { WorkflowTemplatesModule } from '../workflow-templates/workflow-templates.module';
import { TASK_REPOSITORY } from './domain/repositories/task.repository.port';
import { AddTaskNoteUseCase } from './application/use-cases/add-task-note.use-case';
import { ApproveTaskUseCase } from './application/use-cases/approve-task.use-case';
import { AssignTaskUseCase } from './application/use-cases/assign-task.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { CompleteTaskUseCase } from './application/use-cases/complete-task.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { RejectTaskUseCase } from './application/use-cases/reject-task.use-case';
import { ToggleChecklistItemUseCase } from './application/use-cases/toggle-checklist-item.use-case';
import { AdvanceWorkflowService } from './application/services/advance-workflow.service';
import { TaskWorkflowPreviewService } from './application/services/task-workflow-preview.service';
import { TaskDocument, TaskSchema } from './infrastructure/schemas/task.schema';
import { TaskMongoRepository } from './infrastructure/repositories/task.mongo.repository';
import { TasksController } from './interface/controllers/tasks.controller';
import { RealtimeTaskRepository } from './interface/realtime/realtime-task.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaskDocument.name, schema: TaskSchema }]),
    ClientsModule,
    IamModule,
    WorkflowTemplatesModule,
  ],
  controllers: [TasksController],
  providers: [
    TaskMongoRepository,
    { provide: TASK_REPOSITORY, useClass: RealtimeTaskRepository },
    AdvanceWorkflowService,
    TaskWorkflowPreviewService,
    CreateTaskUseCase,
    CompleteTaskUseCase,
    ApproveTaskUseCase,
    RejectTaskUseCase,
    AssignTaskUseCase,
    ToggleChecklistItemUseCase,
    ListTasksUseCase,
    AddTaskNoteUseCase,
  ],
  exports: [TASK_REPOSITORY],
})
export class TasksModule {}
