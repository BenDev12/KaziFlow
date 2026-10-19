import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import { RoutePurpose } from '../../domain/entities/route.entity';

@Schema(baseSchemaOptions)
export class RouteDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, enum: ['follow_up', 'initial_visit', 'general'] })
  purpose!: RoutePurpose;

  @Prop({ type: String, default: null })
  agentId!: string | null;

  @Prop({ type: String, default: null })
  agentName!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RouteSchema = SchemaFactory.createForClass(RouteDocument);
RouteSchema.index({ orgId: 1, agentId: 1 });
