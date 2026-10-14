import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { InviteStatus } from '../../domain/entities/invite.entity';

/** Not tenant-scoped through BaseMongoRepository — see InviteRepository. */
@Schema(baseSchemaOptions)
export class InviteDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ type: String, required: true })
  orgId!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, enum: ['org_admin', 'manager', 'agent'] })
  role!: UserRole;

  @Prop({ type: String, default: null })
  departmentId!: string | null;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ required: true, enum: ['pending', 'accepted', 'revoked'], default: 'pending' })
  status!: InviteStatus;

  @Prop({ required: true })
  invitedByUserId!: string;

  @Prop({ required: true, trim: true })
  invitedByName!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const InviteSchema = SchemaFactory.createForClass(InviteDocument);
// token's unique index comes from the @Prop({ unique: true }) above.
InviteSchema.index({ orgId: 1, email: 1, status: 1 });
