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

    // $or is used twice over (search OR, department OR) — composed under
    // $and rather than letting the second assignment clobber the first.
    const andConditions: FilterQuery<ClientDocument>[] = [];
    if (filter.search) {
      const pattern = new RegExp(escapeRegExp(filter.search), 'i');
      andConditions.push({ $or: [{ name: pattern }, { contact: pattern }] });
    }
    if (filter.departmentId) {
      // Records with no department (created before departments existed, or
      // by an unassigned member) stay visible to everyone — only a record
      // explicitly tagged with a DIFFERENT department is hidden.
      andConditions.push({ $or: [{ departmentId: filter.departmentId }, { departmentId: null }] });
    }
    if (andConditions.length > 0) query.$and = andConditions;

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
      departmentId: client.departmentId,
      industry: client.industry,
      priority: client.priority,
      lastVisit: client.lastVisit,
      lastNotes: client.lastNotes,
      status: client.status,
      contacts: client.contacts,
      preferredVisitTime: client.preferredVisitTime,
      routeId: client.routeId,
      routeAddedAt: client.routeAddedAt,
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
        routeId: client.routeId,
        routeAddedAt: client.routeAddedAt,
      },
    );
    if (!doc) throw new Error(`Cannot save Client "${client.id}": document not found`);
    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteOneScoped({ _id: id });
  }

  async unassignRoute(routeId: string): Promise<void> {
    await this.updateManyScoped({ routeId }, { routeId: null, routeAddedAt: null });
  }

  private toDomain(doc: ClientDocument): Client {
    return Client.reconstitute(
      {
        name: doc.name,
        contact: doc.contact,
        phone: doc.phone,
        callCycle: doc.callCycle,
        address: doc.address,
        departmentId: doc.departmentId,
        industry: doc.industry,
        priority: doc.priority,
        lastVisit: doc.lastVisit,
        lastNotes: doc.lastNotes,
        status: doc.status,
        contacts: doc.contacts,
        preferredVisitTime: doc.preferredVisitTime,
        routeId: doc.routeId,
        routeAddedAt: doc.routeAddedAt,
      },
      doc._id,
    );
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
