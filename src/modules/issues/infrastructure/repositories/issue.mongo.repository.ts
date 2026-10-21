import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Issue } from '../../domain/entities/issue.entity';
import { IssueListFilter, IssueRepository } from '../../domain/repositories/issue.repository.port';
import { IssueDocument } from '../schemas/issue.schema';

@Injectable()
export class IssueMongoRepository
  extends BaseMongoRepository<IssueDocument>
  implements IssueRepository
{
  constructor(@InjectModel(IssueDocument.name) model: Model<IssueDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Issue | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter: IssueListFilter = {}): Promise<Issue[]> {
    const query: FilterQuery<IssueDocument> = {};
    if (filter.status) query.status = filter.status;
    if (filter.clientId) query.clientId = filter.clientId;
    if (filter.departmentId) {
      // Records with no department (created before departments existed, or
      // by an unassigned member) stay visible to everyone — only a record
      // explicitly tagged with a DIFFERENT department is hidden.
      query.$or = [{ departmentId: filter.departmentId }, { departmentId: null }];
    }
    const docs = await this.findManyScoped(query, { createdAt: -1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(issue: Issue): Promise<Issue> {
    const doc = await this.createScoped({
      _id: issue.id,
      clientId: issue.clientId,
      clientName: issue.clientName,
      agentId: issue.agentId,
      agentName: issue.agentName,
      departmentId: issue.departmentId,
      description: issue.description,
      visitNote: issue.visitNote,
      activityLogId: issue.activityLogId,
      status: issue.status,
      resolutionNote: issue.resolutionNote,
      resolvedById: issue.resolvedById,
      resolvedByName: issue.resolvedByName,
      resolvedAt: issue.resolvedAt,
    });
    return this.toDomain(doc);
  }

  async save(issue: Issue): Promise<Issue> {
    const doc = await this.updateOneScoped(
      { _id: issue.id },
      {
        status: issue.status,
        resolutionNote: issue.resolutionNote,
        resolvedById: issue.resolvedById,
        resolvedByName: issue.resolvedByName,
        resolvedAt: issue.resolvedAt,
      },
    );
    if (!doc) throw new Error(`Cannot save Issue "${issue.id}": document not found`);
    return this.toDomain(doc);
  }

  private toDomain(doc: IssueDocument): Issue {
    return Issue.reconstitute(
      {
        clientId: doc.clientId,
        clientName: doc.clientName,
        agentId: doc.agentId,
        agentName: doc.agentName,
        departmentId: doc.departmentId,
        description: doc.description,
        visitNote: doc.visitNote,
        activityLogId: doc.activityLogId,
        status: doc.status,
        resolutionNote: doc.resolutionNote,
        resolvedById: doc.resolvedById,
        resolvedByName: doc.resolvedByName,
        resolvedAt: doc.resolvedAt,
        createdAt: doc.createdAt,
      },
      doc._id,
    );
  }
}
