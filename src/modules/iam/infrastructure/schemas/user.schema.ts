import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

/**
 * Globally addressable by email (login has no org-selection step), so
 * this collection is NOT scoped through BaseMongoRepository — `orgId` is
 * nullable (a user can exist pre-onboarding) rather than a hard tenant key.
 */
@Schema(baseSchemaOptions)
export class UserDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['org_admin', 'manager', 'agent'] })
  role!: UserRole;

  @Prop({ type: String, default: null })
  orgId!: string | null;

  @Prop({ type: String, default: null })
  departmentId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
// email's unique index comes from the @Prop({ unique: true }) above.
UserSchema.index({ orgId: 1 });
UserSchema.index({ departmentId: 1 });
