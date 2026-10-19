import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';
import { PasswordResetStatus } from '../../domain/entities/password-reset-token.entity';

/** Not tenant-scoped through BaseMongoRepository — see PasswordResetTokenRepository. */
@Schema(baseSchemaOptions)
export class PasswordResetTokenDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ required: true, enum: ['pending', 'used', 'revoked'], default: 'pending' })
  status!: PasswordResetStatus;

  @Prop({ required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetTokenDocument);
// token's unique index comes from the @Prop({ unique: true }) above.
PasswordResetTokenSchema.index({ userId: 1, status: 1 });
