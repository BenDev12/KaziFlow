import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import { ChecklistItem, Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface CreateTaskInput {
  clientId: string;
  agentId: string;
  agentName: string;
  /** The creator's own department — used only when no templateId is given (today's plain-task behavior). */
  departmentId: string | null;
  description: string;
  dueDate?: Date;
  /** Omit for a task not tied to a specific logged visit (e.g. one started from a template). */
  activityLogId?: string;
  /** Picking a template overrides departmentId with the template's entry stage's department. */
  templateId?: string;
}

@Injectable()
export class CreateTaskUseCase implements UseCase<CreateTaskInput, Task> {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    let departmentId = input.departmentId;
    let templateId: string | null = null;
    let stageId: string | null = null;
    let requiresApproval = false;
    let checklistItems: ChecklistItem[] = [];

    if (input.templateId) {
      const template = await this.templates.findById(input.templateId);
      if (!template) throw new NotFoundError('WorkflowTemplate', input.templateId);
      const entryStage = template.getStage(template.entryStageId);
      if (!entryStage) {
        // Guarded against at creation time (WorkflowTemplate.create validates
        // entryStageId), so this is defensive, not a path a client can trigger.
        throw new Error(`Template "${template.id}" has no valid entry stage`);
      }
      departmentId = entryStage.departmentId;
      templateId = template.id;
      stageId = entryStage.id;
      requiresApproval = entryStage.requiresApproval;
      checklistItems = entryStage.checklistTemplate.map((label) => ({
        id: randomUUID(),
        label,
        done: false,
      }));
    }

    const task = Task.create(
      {
        clientId: client.id,
        clientName: client.name,
        agentId: input.agentId,
        agentName: input.agentName,
        departmentId,
        description: input.description,
        dueDate: input.dueDate,
        activityLogId: input.activityLogId ?? null,
        templateId,
        stageId,
        requiresApproval,
        checklistItems,
        parentTaskId: null,
      },
      randomUUID(),
    );
    return this.tasks.create(task);
  }
}
