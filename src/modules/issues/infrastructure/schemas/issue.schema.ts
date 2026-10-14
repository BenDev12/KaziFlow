import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { IssueStatus } from '../../domain/entities/issue.entity';

@Schema(baseSchemaOptions)
export class IssueDocument extends Document<string> {
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

  @Prop({ required: true, trim: true })
  visitNote!: string;

  @Prop({ type: String, required: true })
  activityLogId!: string;

  @Prop({ required: true, enum: ['open', 'resolved'], default: 'open' })
  status!: IssueStatus;

  @Prop({ type: String, default: null })
  resolutionNote!: string | null;

  @Prop({ type: String, default: null })
  resolvedById!: string | null;

  @Prop({ type: String, default: null })
  resolvedByName!: string | null;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const IssueSchema = SchemaFactory.createForClass(IssueDocument);
IssueSchema.index({ orgId: 1, status: 1 });
IssueSchema.index({ orgId: 1, clientId: 1 });
IssueSchema.index({ orgId: 1, departmentId: 1 });
