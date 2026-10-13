import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationRepository } from '../../domain/repositories/organization.repository.port';
import { OrganizationDocument } from '../schemas/organization.schema';

@Injectable()
export class OrganizationMongoRepository implements OrganizationRepository {
  constructor(
    @InjectModel(OrganizationDocument.name) private readonly model: Model<OrganizationDocument>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(org: Organization): Promise<Organization> {
    const created = await new this.model({
      _id: org.id,
      name: org.name,
      domain: org.domain,
      industry: org.industry,
      timezone: org.timezone,
      setupComplete: org.setupComplete,
    }).save();
    return this.toDomain(created);
  }

  private toDomain(doc: OrganizationDocument): Organization {
    return Organization.reconstitute(
      {
        name: doc.name,
        domain: doc.domain,
        industry: doc.industry,
        timezone: doc.timezone,
        setupComplete: doc.setupComplete,
      },
      doc._id,
    );
  }
}
