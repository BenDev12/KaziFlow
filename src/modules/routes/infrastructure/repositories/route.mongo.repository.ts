import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Route } from '../../domain/entities/route.entity';
import { RouteRepository } from '../../domain/repositories/route.repository.port';
import { RouteDocument } from '../schemas/route.schema';

@Injectable()
export class RouteMongoRepository
  extends BaseMongoRepository<RouteDocument>
  implements RouteRepository
{
  constructor(@InjectModel(RouteDocument.name) model: Model<RouteDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Route | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findByAgentId(agentId: string): Promise<Route | null> {
    const doc = await this.findOneScoped({ agentId });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Route[]> {
    const docs = await this.findManyScoped({}, { name: 1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(route: Route): Promise<Route> {
    const doc = await this.createScoped({
      _id: route.id,
      name: route.name,
      purpose: route.purpose,
      agentId: route.agentId,
      agentName: route.agentName,
    });
    return this.toDomain(doc);
  }

  async save(route: Route): Promise<Route> {
    const doc = await this.updateOneScoped(
      { _id: route.id },
      {
        name: route.name,
        purpose: route.purpose,
        agentId: route.agentId,
        agentName: route.agentName,
      },
    );
    if (!doc) throw new Error(`Cannot save Route "${route.id}": document not found`);
    return this.toDomain(doc);
  }

  private toDomain(doc: RouteDocument): Route {
    return Route.reconstitute(
      { name: doc.name, purpose: doc.purpose, agentId: doc.agentId, agentName: doc.agentName },
      doc._id,
    );
  }
}
