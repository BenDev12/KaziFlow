import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GmailIntegration } from '../../domain/entities/gmail-integration.entity';
import { GmailIntegrationRepository } from '../../domain/repositories/gmail-integration.repository.port';
import { GmailIntegrationDocument } from '../schemas/gmail-integration.schema';

function toEntity(doc: GmailIntegrationDocument): GmailIntegration {
  return new GmailIntegration({
    orgId: doc._id,
    connectedEmail: doc.connectedEmail,
    departmentId: doc.departmentId,
    keywords: doc.keywords,
    connectedByUserId: doc.connectedByUserId,
    connectedByUserName: doc.connectedByUserName,
    refreshTokenEncrypted: doc.refreshTokenEncrypted,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

/**
 * Deliberately NOT built on BaseMongoRepository — this collection is keyed
 * by orgId (one doc per org) rather than scoped by it, and the poller's
 * findAllReadyToPoll() needs to read across every org in one pass, which
 * BaseMongoRepository's TenantContext-scoping would make impossible.
 */
@Injectable()
export class GmailIntegrationMongoRepository implements GmailIntegrationRepository {
  constructor(
    @InjectModel(GmailIntegrationDocument.name)
    private readonly model: Model<GmailIntegrationDocument>,
  ) {}

  async findByOrgId(orgId: string): Promise<GmailIntegration | null> {
    const doc = await this.model.findById(orgId).exec();
    return doc ? toEntity(doc) : null;
  }

  async findAllReadyToPoll(): Promise<GmailIntegration[]> {
    const docs = await this.model
      .find({ departmentId: { $ne: null }, keywords: { $not: { $size: 0 } } })
      .exec();
    return docs.map(toEntity).filter((integration) => integration.isReadyToPoll);
  }

  async upsert(integration: GmailIntegration): Promise<void> {
    await this.model
      .findByIdAndUpdate(
        integration.orgId,
        {
          _id: integration.orgId,
          connectedEmail: integration.connectedEmail,
          departmentId: integration.departmentId,
          keywords: integration.keywords,
          connectedByUserId: integration.connectedByUserId,
          connectedByUserName: integration.connectedByUserName,
          refreshTokenEncrypted: integration.refreshTokenEncrypted,
        },
        { upsert: true },
      )
      .exec();
  }

  async deleteByOrgId(orgId: string): Promise<void> {
    await this.model.deleteOne({ _id: orgId }).exec();
  }
}
