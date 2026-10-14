import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { TaskStatus } from '../../domain/entities/task.entity';

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

  @Prop({ type: String, required: true })
  activityLogId!: string;

  @Prop({ required: true, enum: ['pending', 'completed'], default: 'pending' })
  status!: TaskStatus;

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
