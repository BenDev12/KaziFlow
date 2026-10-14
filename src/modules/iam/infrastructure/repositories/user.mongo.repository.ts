import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository.port';
import { UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserMongoRepository implements UserRepository {
  constructor(@InjectModel(UserDocument.name) private readonly model: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email: email.trim().toLowerCase() }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async countInDepartment(departmentId: string): Promise<number> {
    return this.model.countDocuments({ departmentId });
  }

  async findAllInOrg(orgId: string): Promise<User[]> {
    const docs = await this.model.find({ orgId }).sort({ name: 1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(user: User): Promise<User> {
    const created = await new this.model({
      _id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role,
      orgId: user.orgId,
      departmentId: user.departmentId,
    }).save();
    return this.toDomain(created);
  }

  async save(user: User): Promise<User> {
    const updated = await this.model
      .findByIdAndUpdate(
        user.id,
        { name: user.name, role: user.role, orgId: user.orgId, departmentId: user.departmentId },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new Error(`Cannot save User "${user.id}": document not found`);
    }
    return this.toDomain(updated);
  }

  private toDomain(doc: UserDocument): User {
    return User.reconstitute(
      {
        email: doc.email,
        name: doc.name,
        passwordHash: doc.passwordHash,
        role: doc.role,
        orgId: doc.orgId,
        departmentId: doc.departmentId,
      },
      doc._id,
    );
  }
}
