import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Client } from '../../domain/entities/client.entity';
import {
  ClientListFilter,
  ClientRepository,
} from '../../domain/repositories/client.repository.port';
import { ClientDocument } from '../schemas/client.schema';

@Injectable()
export class ClientMongoRepository
  extends BaseMongoRepository<ClientDocument>
  implements ClientRepository
{
  constructor(@InjectModel(ClientDocument.name) model: Model<ClientDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Client | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter: ClientListFilter = {}): Promise<Client[]> {
    const query: FilterQuery<ClientDocument> = {};
    if (filter.priority) query.priority = filter.priority;
    if (filter.callCycle) query.callCycle = filter.callCycle;
    if (filter.search) {
      const pattern = new RegExp(escapeRegExp(filter.search), 'i');
      query.$or = [{ name: pattern }, { contact: pattern }];
    }
    const docs = await this.findManyScoped(query, { name: 1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(client: Client): Promise<Client> {
    const doc = await this.createScoped({
      _id: client.id,
      name: client.name,
      contact: client.contact,
      phone: client.phone,
      callCycle: client.callCycle,
      address: client.address,
      industry: client.industry,
      priority: client.priority,
      lastVisit: client.lastVisit,
      lastNotes: client.lastNotes,
      status: client.status,
      contacts: client.contacts,
      preferredVisitTime: client.preferredVisitTime,
    });
    return this.toDomain(doc);
  }

  async save(client: Client): Promise<Client> {
    const doc = await this.updateOneScoped(
      { _id: client.id },
      {
        name: client.name,
        contact: client.contact,
        phone: client.phone,
        callCycle: client.callCycle,
        address: client.address,
        industry: client.industry,
        priority: client.priority,
        lastVisit: client.lastVisit,
        lastNotes: client.lastNotes,
        status: client.status,
        contacts: client.contacts,
        preferredVisitTime: client.preferredVisitTime,
      },
    );
    if (!doc) throw new Error(`Cannot save Client "${client.id}": document not found`);
    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteOneScoped({ _id: id });
  }

  private toDomain(doc: ClientDocument): Client {
    return Client.reconstitute(
      {
        name: doc.name,
        contact: doc.contact,
        phone: doc.phone,
        callCycle: doc.callCycle,
        address: doc.address,
        industry: doc.industry,
        priority: doc.priority,
        lastVisit: doc.lastVisit,
        lastNotes: doc.lastNotes,
        status: doc.status,
        contacts: doc.contacts,
        preferredVisitTime: doc.preferredVisitTime,
      },
      doc._id,
    );
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
