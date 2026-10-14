import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Invite } from '../../domain/entities/invite.entity';
import { InviteRepository } from '../../domain/repositories/invite.repository.port';
import { InviteDocument } from '../schemas/invite.schema';

@Injectable()
export class InviteMongoRepository implements InviteRepository {
  constructor(@InjectModel(InviteDocument.name) private readonly model: Model<InviteDocument>) {}

  async findById(id: string): Promise<Invite | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByToken(token: string): Promise<Invite | null> {
    const doc = await this.model.findOne({ token }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findPendingByOrgAndEmail(orgId: string, email: string): Promise<Invite | null> {
    const doc = await this.model
      .findOne({ orgId, email: email.trim().toLowerCase(), status: 'pending' })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByOrg(orgId: string): Promise<Invite[]> {
    const docs = await this.model.find({ orgId }).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(invite: Invite): Promise<Invite> {
    const created = await new this.model({
      _id: invite.id,
      orgId: invite.orgId,
      email: invite.email,
      role: invite.role,
      departmentId: invite.departmentId,
      token: invite.token,
      status: invite.status,
      invitedByUserId: invite.invitedByUserId,
      invitedByName: invite.invitedByName,
      expiresAt: invite.expiresAt,
    }).save();
    return this.toDomain(created);
  }

  async save(invite: Invite): Promise<Invite> {
    const updated = await this.model
      .findByIdAndUpdate(invite.id, { status: invite.status }, { new: true })
      .exec();
    if (!updated) {
      throw new Error(`Cannot save Invite "${invite.id}": document not found`);
    }
    return this.toDomain(updated);
  }

  private toDomain(doc: InviteDocument): Invite {
    return Invite.reconstitute(
      {
        orgId: doc.orgId,
        email: doc.email,
        role: doc.role,
        departmentId: doc.departmentId,
        token: doc.token,
        status: doc.status,
        invitedByUserId: doc.invitedByUserId,
        invitedByName: doc.invitedByName,
        expiresAt: doc.expiresAt,
        createdAt: doc.createdAt,
      },
      doc._id,
    );
  }
}
