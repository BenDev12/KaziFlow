import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import {
  WorkflowStageProps,
  WorkflowTemplate,
} from '../../domain/entities/workflow-template.entity';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../domain/repositories/workflow-template.repository.port';

export interface CreateWorkflowTemplateInput {
  orgId: string;
  name: string;
  entryStageId: string;
  stages: {
    id: string;
    name: string;
    departmentId: string;
    requiresApproval?: boolean;
    checklistTemplate?: string[];
    nextStageIds?: string[];
  }[];
}

@Injectable()
export class CreateWorkflowTemplateUseCase implements UseCase<
  CreateWorkflowTemplateInput,
  WorkflowTemplate
> {
  constructor(
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(input: CreateWorkflowTemplateInput): Promise<WorkflowTemplate> {
    const stages: WorkflowStageProps[] = input.stages.map((s) => ({
      id: s.id,
      name: s.name,
      departmentId: s.departmentId,
      requiresApproval: s.requiresApproval ?? false,
      checklistTemplate: s.checklistTemplate ?? [],
      nextStageIds: s.nextStageIds ?? [],
    }));

    const template = WorkflowTemplate.create(
      { orgId: input.orgId, name: input.name, entryStageId: input.entryStageId, stages },
      randomUUID(),
    );
    return this.templates.create(template);
  }
}
