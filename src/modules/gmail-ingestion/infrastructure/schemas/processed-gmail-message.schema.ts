import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../../../shared/infrastructure/database/base.schema';

/**
 * One row per Gmail message the poller has ever looked at — whether it
 * matched a watch keyword or not. _id is the Gmail message id itself, so
 * re-inserting the same message on the next poll is a natural duplicate-key
 * no-op rather than something the service has to check for separately.
 */
@Schema(baseSchemaOptions)
export class ProcessedGmailMessageDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop({ type: String, required: true })
  orgId!: string;

  @Prop({ type: Boolean, required: true })
  matched!: boolean;

  /** Set only when matched — the task this email became. */
  @Prop({ type: String, default: null })
  taskId!: string | null;

  createdAt!: Date;
}

export const ProcessedGmailMessageSchema = SchemaFactory.createForClass(
  ProcessedGmailMessageDocument,
);
