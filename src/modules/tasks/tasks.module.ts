import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '../clients/clients.module';
import { TASK_REPOSITORY } from './domain/repositories/task.repository.port';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { CompleteTaskUseCase } from './application/use-cases/complete-task.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { TaskDocument, TaskSchema } from './infrastructure/schemas/task.schema';
import { TaskMongoRepository } from './infrastructure/repositories/task.mongo.repository';
import { TasksController } from './interface/controllers/tasks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaskDocument.name, schema: TaskSchema }]),
    ClientsModule,
  ],
  controllers: [TasksController],
  providers: [
    { provide: TASK_REPOSITORY, useClass: TaskMongoRepository },
    CreateTaskUseCase,
    CompleteTaskUseCase,
    ListTasksUseCase,
  ],
  exports: [TASK_REPOSITORY],
})
export class TasksModule {}
