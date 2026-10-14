import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { WorkflowTemplate } from '../../domain/entities/workflow-template.entity';
import {
  WORKFLOW_TEMPLATE_REPOSITORY,
  WorkflowTemplateRepository,
} from '../../domain/repositories/workflow-template.repository.port';

@Injectable()
export class ListWorkflowTemplatesUseCase implements UseCase<void, WorkflowTemplate[]> {
  constructor(
    @Inject(WORKFLOW_TEMPLATE_REPOSITORY) private readonly templates: WorkflowTemplateRepository,
  ) {}

  async execute(): Promise<WorkflowTemplate[]> {
    return this.templates.findAll();
  }
}
