import { WorkflowTemplate } from '../entities/workflow-template.entity';

export const WORKFLOW_TEMPLATE_REPOSITORY = Symbol('WORKFLOW_TEMPLATE_REPOSITORY');

export interface WorkflowTemplateRepository {
  findById(id: string): Promise<WorkflowTemplate | null>;
  findAll(): Promise<WorkflowTemplate[]>;
  create(template: WorkflowTemplate): Promise<WorkflowTemplate>;
  delete(id: string): Promise<boolean>;
}
