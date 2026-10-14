import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface CreateTaskInput {
  clientId: string;
  agentId: string;
  agentName: string;
  departmentId: string | null;
  description: string;
  dueDate?: Date;
  activityLogId: string;
}

@Injectable()
export class CreateTaskUseCase implements UseCase<CreateTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    const task = Task.create(
      { ...input, clientId: client.id, clientName: client.name },
      randomUUID(),
    );
    return this.tasks.create(task);
  }
}
