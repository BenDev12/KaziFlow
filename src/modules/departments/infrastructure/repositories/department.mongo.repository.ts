import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Department } from '../../domain/entities/department.entity';
import { DepartmentRepository } from '../../domain/repositories/department.repository.port';
import { DepartmentDocument } from '../schemas/department.schema';

@Injectable()
export class DepartmentMongoRepository
  extends BaseMongoRepository<DepartmentDocument>
  implements DepartmentRepository
{
  constructor(@InjectModel(DepartmentDocument.name) model: Model<DepartmentDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Department | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findByIdUnscoped(id: string): Promise<Department | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByName(name: string): Promise<Department | null> {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await this.findOneScoped({ name: new RegExp(`^${escaped}$`, 'i') });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Department[]> {
    const docs = await this.findManyScoped({}, { name: 1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(department: Department): Promise<Department> {
    const doc = await this.createScoped({ _id: department.id, name: department.name });
    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteOneScoped({ _id: id });
  }

  private toDomain(doc: DepartmentDocument): Department {
    return Department.reconstitute(
      { orgId: doc.orgId, name: doc.name, createdAt: doc.createdAt },
      doc._id,
    );
  }
}
