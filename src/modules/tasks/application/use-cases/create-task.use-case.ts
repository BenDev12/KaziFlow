import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain-error';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../iam/domain/repositories/user.repository.port';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import {
  ChecklistItem,
  Task,
  TaskLink,
  TaskPriority,
  TaskSource,
} from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

export interface CreateTaskInput {
  title: string;
  description?: string;
  clientId?: string;
  agentId: string;
  agentName: string;
  /** The creator's own department — the fallback when no assignee/override/template applies. */
  creatorDepartmentId: string | null;
  /** Explicit department override. Ignored if a template is given (the template's entry stage wins). */
  departmentId?: string;
  assignedToUserId?: string;
  requestingRole: UserRole;
  requestingDepartmentId: string | null;
  dueDate?: Date;
  priority?: TaskPriority;
  source?: TaskSource;
  links?: TaskLink[];
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
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    let clientId: string | null = null;
    let clientName: string | null = null;
    if (input.clientId) {
      const client = await this.clients.findById(input.clientId);
      if (!client) throw new NotFoundError('Client', input.clientId);
      clientId = client.id;
      clientName = client.name;
    }

    let assignee: { id: string; name: string; departmentId: string | null } | null = null;
    if (input.assignedToUserId) {
      const user = await this.users.findById(input.assignedToUserId);
      if (!user) throw new NotFoundError('User', input.assignedToUserId);
      assignee = { id: user.id, name: user.name, departmentId: user.departmentId };
    }

    // Department follows an explicit override, then the assignee, then the creator's own —
    // a template's entry stage (below) always wins over all of this.
    let departmentId = input.departmentId ?? assignee?.departmentId ?? input.creatorDepartmentId;
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

    // Assigning yourself is always fine; handing it to someone else requires
    // managing this task's department (or being org_admin) — same rule as
    // the standalone /assign endpoint.
    if (assignee && assignee.id !== input.agentId) {
      const isAdmin = input.requestingRole === 'org_admin';
      const isDeptManager =
        input.requestingRole === 'manager' && input.requestingDepartmentId === departmentId;
      if (!isDeptManager && !isAdmin) {
        throw new ForbiddenError("Only this department's manager can assign this task");
      }
      if (!isAdmin && departmentId && assignee.departmentId !== departmentId) {
        throw new ValidationError(
          'A manager can only assign this task to a member of their own department',
        );
      }
    }

    const task = Task.create(
      {
        clientId,
        clientName,
        agentId: input.agentId,
        agentName: input.agentName,
        departmentId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        priority: input.priority,
        source: input.source,
        activityLogId: input.activityLogId ?? null,
        templateId,
        stageId,
        requiresApproval,
        checklistItems,
        assignedToUserId: assignee?.id ?? null,
        assignedToName: assignee?.name ?? null,
        links: input.links,
        parentTaskId: null,
      },
      randomUUID(),
    );
    return this.tasks.create(task);
  }
}
