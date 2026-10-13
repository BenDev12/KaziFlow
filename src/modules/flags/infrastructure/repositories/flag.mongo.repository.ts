import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Flag } from '../../domain/entities/flag.entity';
import { FlagListFilter, FlagRepository } from '../../domain/repositories/flag.repository.port';
import { FlagDocument } from '../schemas/flag.schema';

@Injectable()
export class FlagMongoRepository
  extends BaseMongoRepository<FlagDocument>
  implements FlagRepository
{
  constructor(@InjectModel(FlagDocument.name) model: Model<FlagDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Flag | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter: FlagListFilter = {}): Promise<Flag[]> {
    const query: FilterQuery<FlagDocument> = {};
    if (filter.status) query.status = filter.status;
    if (filter.clientId) query.clientId = filter.clientId;
    const docs = await this.findManyScoped(query, { createdAt: -1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(flag: Flag): Promise<Flag> {
    const doc = await this.createScoped({
      _id: flag.id,
      activityLogId: flag.activityLogId,
      clientId: flag.clientId,
      clientName: flag.clientName,
      agentId: flag.agentId,
      agentName: flag.agentName,
      flagType: flag.flagType,
      status: flag.status,
      visitNote: flag.visitNote,
      personSpokenTo: flag.personSpokenTo,
      resolutionNote: flag.resolutionNote,
      resolvedById: flag.resolvedById,
      resolvedByName: flag.resolvedByName,
      resolvedAt: flag.resolvedAt,
    });
    return this.toDomain(doc);
  }

  async save(flag: Flag): Promise<Flag> {
    const doc = await this.updateOneScoped(
      { _id: flag.id },
      {
        status: flag.status,
        resolutionNote: flag.resolutionNote,
        resolvedById: flag.resolvedById,
        resolvedByName: flag.resolvedByName,
        resolvedAt: flag.resolvedAt,
      },
    );
    if (!doc) throw new Error(`Cannot save Flag "${flag.id}": document not found`);
    return this.toDomain(doc);
  }

  private toDomain(doc: FlagDocument): Flag {
    return Flag.reconstitute(
      {
        activityLogId: doc.activityLogId,
        clientId: doc.clientId,
        clientName: doc.clientName,
        agentId: doc.agentId,
        agentName: doc.agentName,
        flagType: doc.flagType,
        status: doc.status,
        visitNote: doc.visitNote,
        personSpokenTo: doc.personSpokenTo,
        resolutionNote: doc.resolutionNote,
        resolvedById: doc.resolvedById,
        resolvedByName: doc.resolvedByName,
        resolvedAt: doc.resolvedAt,
      },
      doc._id,
    );
  }
}
