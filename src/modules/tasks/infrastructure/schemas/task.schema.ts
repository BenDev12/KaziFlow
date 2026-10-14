import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { TaskStatus } from '../../domain/entities/task.entity';

@Schema({ _id: false })
class ChecklistItemSubdocument {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  label!: string;

  @Prop({ type: Boolean, required: true, default: false })
  done!: boolean;
}

@Schema(baseSchemaOptions)
export class TaskDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ type: String, required: true })
  clientId!: string;

  @Prop({ required: true, trim: true })
  clientName!: string;

  @Prop({ type: String, required: true })
  agentId!: string;

  @Prop({ required: true, trim: true })
  agentName!: string;

  @Prop({ type: String, default: null })
  departmentId!: string | null;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: String, default: null })
  activityLogId!: string | null;

  @Prop({ required: true, enum: ['pending', 'awaiting_approval', 'completed'], default: 'pending' })
  status!: TaskStatus;

  @Prop({ type: String, default: null })
  templateId!: string | null;

  @Prop({ type: String, default: null })
  stageId!: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  requiresApproval!: boolean;

  @Prop({ type: [ChecklistItemSubdocument], default: [] })
  checklistItems!: ChecklistItemSubdocument[];

  @Prop({ type: String, default: null })
  assignedToUserId!: string | null;

  @Prop({ type: String, default: null })
  assignedToName!: string | null;

  @Prop({ type: String, default: null })
  parentTaskId!: string | null;

  @Prop({ type: String, default: null })
  submittedForApprovalById!: string | null;

  @Prop({ type: String, default: null })
  submittedForApprovalByName!: string | null;

  @Prop({ type: Date, default: null })
  submittedForApprovalAt!: Date | null;

  @Prop({ type: String, default: null })
  completedById!: string | null;

  @Prop({ type: String, default: null })
  completedByName!: string | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TaskSchema = SchemaFactory.createForClass(TaskDocument);
TaskSchema.index({ orgId: 1, status: 1 });
TaskSchema.index({ orgId: 1, clientId: 1 });
TaskSchema.index({ orgId: 1, departmentId: 1 });
TaskSchema.index({ orgId: 1, assignedToUserId: 1 });
TaskSchema.index({ orgId: 1, parentTaskId: 1 });
