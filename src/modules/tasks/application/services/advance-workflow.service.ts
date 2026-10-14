import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import { Task } from '../../domain/entities/task.entity';
import { TASK_REPOSITORY, TaskRepository } from '../../domain/repositories/task.repository.port';

/**
 * Runs after a task finishes (complete() or approve()) — looks up its
 * template stage and spawns one brand-new task per `nextStageIds` entry.
 * Fan-out, not just a linear hand-off: a single finished stage can kick off
 * several separate follow-ups in different departments at once.
 *
 * Fails soft, not loud: a plain task (no templateId), a deleted template, or
 * a final stage (no next stages) all just mean "nothing to spawn" — none of
 * these should ever turn completing a task into a 500.
 */
@Injectable()
export class AdvanceWorkflowService {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async advance(finishedTask: Task): Promise<Task[]> {
    if (!finishedTask.templateId || !finishedTask.stageId) return [];

    const template = await this.templates.findById(finishedTask.templateId);
    if (!template) return [];

    const stage = template.getStage(finishedTask.stageId);
    if (!stage || stage.nextStageIds.length === 0) return [];

    const spawned: Task[] = [];
    for (const nextStageId of stage.nextStageIds) {
      const nextStage = template.getStage(nextStageId);
      if (!nextStage) continue; // a dangling id shouldn't be possible (validated at template-create), but never crash a completion over it

      const newTask = Task.create(
        {
          clientId: finishedTask.clientId,
          clientName: finishedTask.clientName,
          // Provenance carries the ORIGINAL requester through the whole
          // chain — "agentId/agentName" means "who this is ultimately for,"
          // not "who clicked the button at this step."
          agentId: finishedTask.agentId,
          agentName: finishedTask.agentName,
          departmentId: nextStage.departmentId,
          description: `${nextStage.name} — ${template.name}`,
          activityLogId: null,
          templateId: template.id,
          stageId: nextStage.id,
          requiresApproval: nextStage.requiresApproval,
          checklistItems: nextStage.checklistTemplate.map((label) => ({
            id: randomUUID(),
            label,
            done: false,
          })),
          parentTaskId: finishedTask.id,
        },
        randomUUID(),
      );
      spawned.push(await this.tasks.create(newTask));
    }
    return spawned;
  }
}
