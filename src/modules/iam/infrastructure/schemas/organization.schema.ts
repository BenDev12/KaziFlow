import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';

/** Not tenant-scoped — this collection defines the tenants. */
@Schema(baseSchemaOptions)
export class OrganizationDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  domain!: string;

  @Prop({ required: true, trim: true })
  industry!: string;

  @Prop({ required: true, trim: true })
  timezone!: string;

  @Prop({ required: true, default: true })
  setupComplete!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(OrganizationDocument);
