import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';

@Schema({ _id: false })
class WorkflowStageSubdocument {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true })
  departmentId!: string;

  @Prop({ type: Boolean, required: true, default: false })
  requiresApproval!: boolean;

  @Prop({ type: [String], default: [] })
  checklistTemplate!: string[];

  @Prop({ type: [String], default: [] })
  nextStageIds!: string[];

  @Prop({ type: { _id: false, x: Number, y: Number }, default: null })
  position!: { x: number; y: number } | null;
}

@Schema(baseSchemaOptions)
export class WorkflowTemplateDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true })
  entryStageId!: string;

  @Prop({ type: [WorkflowStageSubdocument], default: [] })
  stages!: WorkflowStageSubdocument[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const WorkflowTemplateSchema = SchemaFactory.createForClass(WorkflowTemplateDocument);
WorkflowTemplateSchema.index({ orgId: 1, name: 1 });
