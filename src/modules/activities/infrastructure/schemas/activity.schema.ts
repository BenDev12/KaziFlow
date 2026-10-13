import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { ActivityType } from '../../domain/entities/activity.entity';

@Schema(baseSchemaOptions)
export class ActivityDocument extends Document<string> {
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

  @Prop({ required: true, enum: ['office-visit', 'phone-call', 'lunch', 'dinner', 'site-tour'] })
  activityType!: ActivityType;

  @Prop({ required: true, trim: true })
  personSpokenTo!: string;

  @Prop({ required: true, trim: true })
  notes!: string;

  @Prop({ required: true, default: false })
  raisedIssue!: boolean;

  @Prop({ required: true, default: false })
  createdTask!: boolean;

  @Prop({ required: true })
  loggedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(ActivityDocument);
ActivitySchema.index({ orgId: 1, clientId: 1, loggedAt: -1 });
ActivitySchema.index({ orgId: 1, agentId: 1, loggedAt: -1 });
