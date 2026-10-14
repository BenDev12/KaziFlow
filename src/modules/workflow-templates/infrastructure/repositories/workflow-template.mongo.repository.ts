import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import {
  WorkflowTemplate,
  WorkflowStageProps,
} from '../../domain/entities/workflow-template.entity';
import { WorkflowTemplateRepository } from '../../domain/repositories/workflow-template.repository.port';
import { WorkflowTemplateDocument } from '../schemas/workflow-template.schema';

@Injectable()
export class WorkflowTemplateMongoRepository
  extends BaseMongoRepository<WorkflowTemplateDocument>
  implements WorkflowTemplateRepository
{
  constructor(@InjectModel(WorkflowTemplateDocument.name) model: Model<WorkflowTemplateDocument>) {
    super(model);
  }

  async findById(id: string): Promise<WorkflowTemplate | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<WorkflowTemplate[]> {
    const docs = await this.findManyScoped({}, { name: 1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    const doc = await this.createScoped({
      _id: template.id,
      name: template.name,
      entryStageId: template.entryStageId,
      stages: template.stages,
    });
    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteOneScoped({ _id: id });
  }

  private toDomain(doc: WorkflowTemplateDocument): WorkflowTemplate {
    return WorkflowTemplate.reconstitute(
      {
        orgId: doc.orgId,
        name: doc.name,
        entryStageId: doc.entryStageId,
        stages: doc.stages.map((s): WorkflowStageProps => ({
          id: s.id,
          name: s.name,
          departmentId: s.departmentId,
          requiresApproval: s.requiresApproval,
          checklistTemplate: s.checklistTemplate,
          nextStageIds: s.nextStageIds,
        })),
        createdAt: doc.createdAt,
      },
      doc._id,
    );
  }
}
