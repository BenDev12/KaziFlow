import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  baseSchemaOptions,
  orgScopedField,
} from '../../../../shared/infrastructure/database/base.schema';
import {
  CallCycle,
  Contact,
  ClientChangeRequest,
  ClientChangeRequestPatch,
  ClientChangeRequestStatus,
  ClientChangeRequestType,
  ClientPriority,
  ClientStatus,
  VisitTimeSlot,
} from '../../domain/entities/client.entity';

@Schema({ _id: false })
class ContactSubdocument {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  role!: string | null;

  @Prop({ type: String, default: null })
  phone!: string | null;
}

@Schema({ _id: false })
class ChangeRequestPatchSubdocument {
  @Prop({ type: [ContactSubdocument], default: undefined })
  contacts?: Contact[];

  @Prop({ type: String, enum: ['Weekly', 'Bi-weekly', 'Monthly'], default: undefined })
  callCycle?: CallCycle;

  @Prop({ type: String, enum: ['morning', 'midday', 'afternoon'], default: undefined })
  preferredVisitTime?: VisitTimeSlot | null;
}

@Schema({ _id: false })
class ChangeRequestSubdocument {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, enum: ['contacts', 'visitPreferences'] })
  type!: ClientChangeRequestType;

  @Prop({ type: ChangeRequestPatchSubdocument, required: true })
  patch!: ClientChangeRequestPatch;

  @Prop({ type: String, required: true })
  requestedById!: string;

  @Prop({ type: String, required: true })
  requestedByName!: string;

  @Prop({ type: String, default: null })
  requestedByDepartmentId!: string | null;

  @Prop({ type: Date, required: true })
  requestedAt!: Date;

  @Prop({ type: String, required: true, enum: ['pending', 'approved', 'rejected'] })
  status!: ClientChangeRequestStatus;

  @Prop({ type: String, default: null })
  reviewedById!: string | null;

  @Prop({ type: String, default: null })
  reviewedByName!: string | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: String, default: null })
  reviewNote!: string | null;
}

@Schema(baseSchemaOptions)
export class ClientDocument extends Document<string> {
  @Prop({ type: String, required: true })
  declare _id: string;

  @Prop(orgScopedField.orgId)
  orgId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  contact!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, enum: ['Weekly', 'Bi-weekly', 'Monthly'] })
  callCycle!: CallCycle;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ type: String, default: null })
  departmentId!: string | null;

  @Prop({ type: String, default: null })
  industry!: string | null;

  @Prop({ type: String, enum: ['hot', 'warm', 'cold'], default: null })
  priority!: ClientPriority | null;

  @Prop({ type: Date, default: null })
  lastVisit!: Date | null;

  @Prop({ type: String, default: null })
  lastNotes!: string | null;

  @Prop({ required: true, enum: ['active', 'pending'], default: 'pending' })
  status!: ClientStatus;

  @Prop({ type: [ContactSubdocument], default: [] })
  contacts!: Contact[];

  @Prop({ type: String, enum: ['morning', 'midday', 'afternoon'], default: null })
  preferredVisitTime!: VisitTimeSlot | null;

  @Prop({ type: String, default: null })
  routeId!: string | null;

  @Prop({ type: Date, default: null })
  routeAddedAt!: Date | null;

  @Prop({ type: [ChangeRequestSubdocument], default: [] })
  changeRequests!: ClientChangeRequest[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const ClientSchema = SchemaFactory.createForClass(ClientDocument);
ClientSchema.index({ orgId: 1, name: 1 });
ClientSchema.index({ orgId: 1, priority: 1 });
ClientSchema.index({ orgId: 1, callCycle: 1 });
ClientSchema.index({ orgId: 1, departmentId: 1 });
ClientSchema.index({ orgId: 1, routeId: 1 });
