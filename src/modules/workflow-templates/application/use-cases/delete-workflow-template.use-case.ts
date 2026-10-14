import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../domain/repositories/workflow-template.repository.port';

export interface DeleteWorkflowTemplateInput {
  templateId: string;
}

/**
 * Deliberately no "is this template in use" check (unlike deleting a
 * department) — a task that already references a deleted template simply
 * stops advancing when it's next completed (AdvanceWorkflowService treats a
 * missing template as "nothing to spawn," not an error). Already-spawned
 * tasks are untouched either way.
 */
@Injectable()
export class DeleteWorkflowTemplateUseCase implements UseCase<DeleteWorkflowTemplateInput, void> {
  constructor(
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(input: DeleteWorkflowTemplateInput): Promise<void> {
    const deleted = await this.templates.delete(input.templateId);
    if (!deleted) throw new NotFoundError('WorkflowTemplate', input.templateId);
  }
}
