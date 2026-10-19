import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository.port';
import { PasswordResetTokenDocument } from '../schemas/password-reset-token.schema';

@Injectable()
export class PasswordResetTokenMongoRepository implements PasswordResetTokenRepository {
  constructor(
    @InjectModel(PasswordResetTokenDocument.name)
    private readonly model: Model<PasswordResetTokenDocument>,
  ) {}

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const doc = await this.model.findOne({ token }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findPendingByUserId(userId: string): Promise<PasswordResetToken[]> {
    const docs = await this.model.find({ userId, status: 'pending' }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(resetToken: PasswordResetToken): Promise<PasswordResetToken> {
    const created = await new this.model({
      _id: resetToken.id,
      userId: resetToken.userId,
      email: resetToken.email,
      token: resetToken.token,
      status: resetToken.status,
      expiresAt: resetToken.expiresAt,
    }).save();
    return this.toDomain(created);
  }

  async save(resetToken: PasswordResetToken): Promise<PasswordResetToken> {
    const updated = await this.model
      .findByIdAndUpdate(resetToken.id, { status: resetToken.status }, { new: true })
      .exec();
    if (!updated) {
      throw new Error(`Cannot save PasswordResetToken "${resetToken.id}": document not found`);
    }
    return this.toDomain(updated);
  }

  private toDomain(doc: PasswordResetTokenDocument): PasswordResetToken {
    return PasswordResetToken.reconstitute(
      {
        userId: doc.userId,
        email: doc.email,
        token: doc.token,
        status: doc.status,
        expiresAt: doc.expiresAt,
        createdAt: doc.createdAt,
      },
      doc._id,
    );
  }
}
