import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';

/** One per org — _id is the orgId itself, so connecting twice is a natural upsert. */
@Schema(baseSchemaOptions)
export class GmailIntegrationDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ type: String, required: true })
  connectedEmail!: string;

  @Prop({ type: String, default: null })
  departmentId!: string | null;

  @Prop({ type: [String], default: [] })
  keywords!: string[];

  @Prop({ type: String, required: true })
  connectedByUserId!: string;

  @Prop({ type: String, required: true })
  connectedByUserName!: string;

  @Prop({ type: String, required: true })
  refreshTokenEncrypted!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const GmailIntegrationSchema = SchemaFactory.createForClass(GmailIntegrationDocument);
