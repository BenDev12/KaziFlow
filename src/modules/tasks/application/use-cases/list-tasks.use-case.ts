import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Task } from '../../domain/entities/task.entity';
import {
  TASK_REPOSITORY,
  TaskListFilter,
  TaskRepository,
} from '../../domain/repositories/task.repository.port';

@Injectable()
export class ListTasksUseCase implements UseCase<TaskListFilter | undefined, Task[]> {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(filter?: TaskListFilter): Promise<Task[]> {
    return this.tasks.findAll(filter);
  }
}
