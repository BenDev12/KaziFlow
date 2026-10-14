import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';

@Schema(baseSchemaOptions)
export class DepartmentDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(DepartmentDocument);
// One org can't have two departments with the same name.
DepartmentSchema.index({ orgId: 1, name: 1 }, { unique: true });
