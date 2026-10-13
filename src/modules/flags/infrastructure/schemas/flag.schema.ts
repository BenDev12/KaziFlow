import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { FlagStatus, FlagType } from '../../domain/entities/flag.entity';

const FLAG_TYPES: FlagType[] = [
  'complaint',
  'executive_visit',
  'close_opportunity',
  'payment_collection',
  'follow_up',
  'new_contact',
];

@Schema(baseSchemaOptions)
export class FlagDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ type: String, required: true })
  activityLogId!: string;

  @Prop({ type: String, required: true })
  clientId!: string;

  @Prop({ required: true, trim: true })
  clientName!: string;

  @Prop({ type: String, required: true })
  agentId!: string;

  @Prop({ required: true, trim: true })
  agentName!: string;

  @Prop({ required: true, enum: FLAG_TYPES })
  flagType!: FlagType;

  @Prop({ required: true, enum: ['open', 'resolved'], default: 'open' })
  status!: FlagStatus;

  @Prop({ required: true, trim: true })
  visitNote!: string;

  @Prop({ required: true, trim: true })
  personSpokenTo!: string;

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

export const FlagSchema = SchemaFactory.createForClass(FlagDocument);
FlagSchema.index({ orgId: 1, status: 1 });
FlagSchema.index({ orgId: 1, clientId: 1 });
