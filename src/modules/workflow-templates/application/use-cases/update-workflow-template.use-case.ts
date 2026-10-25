import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { WorkflowTemplate } from '../../domain/entities/workflow-template.entity';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../domain/repositories/workflow-template.repository.port';
import { toStageProps, WorkflowStageInput } from './create-workflow-template.use-case';

export interface UpdateWorkflowTemplateInput {
  templateId: string;
  name: string;
  entryStageId: string;
  stages: WorkflowStageInput[];
}

/** Full replacement of a template's graph — see WorkflowTemplate.update for what happens to tasks already in flight. */
@Injectable()
export class UpdateWorkflowTemplateUseCase implements UseCase<
  UpdateWorkflowTemplateInput,
  WorkflowTemplate
> {
  constructor(
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(input: UpdateWorkflowTemplateInput): Promise<WorkflowTemplate> {
    const template = await this.templates.findById(input.templateId);
    if (!template) throw new NotFoundError('WorkflowTemplate', input.templateId);

    template.update({
      name: input.name,
      entryStageId: input.entryStageId,
      stages: toStageProps(input.stages),
    });
    return this.templates.save(template);
  }
}
