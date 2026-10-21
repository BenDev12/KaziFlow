import { Inject, Injectable } from '@nestjs/common';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import { Task } from '../../domain/entities/task.entity';

export interface NextStagePreview {
  id: string;
  name: string;
  departmentId: string;
}

/**
 * Resolves the stage(s) a pending/awaiting-approval workflow task will hand
 * off to once finished — lets the UI show "this goes to Finance next"
 * before the action is taken, instead of only finding out after (see
 * AdvanceWorkflowService for the actual hand-off, which runs on completion).
 * Read-only response shaping, not a use-case in its own right — used
 * directly by TasksController.
 */
@Injectable()
export class TaskWorkflowPreviewService {
  constructor(
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async nextStagesFor(tasks: Task[]): Promise<Map<string, NextStagePreview[]>> {
    const result = new Map<string, NextStagePreview[]>();

    const templateIds = [
      ...new Set(
        tasks
          .filter((t) => t.templateId && t.stageId && t.status !== 'completed')
          .map((t) => t.templateId as string),
      ),
    ];
    if (templateIds.length === 0) return result;

    const templateById = new Map(
      (await Promise.all(templateIds.map((id) => this.templates.findById(id))))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .map((t) => [t.id, t] as const),
    );

    for (const task of tasks) {
      if (!task.templateId || !task.stageId || task.status === 'completed') continue;
      const template = templateById.get(task.templateId);
      if (!template) continue;
      const stage = template.getStage(task.stageId);
      if (!stage) continue;

      const next = stage.nextStageIds
        .map((id) => template.getStage(id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({ id: s.id, name: s.name, departmentId: s.departmentId }));
      result.set(task.id, next);
    }

    return result;
  }
}
