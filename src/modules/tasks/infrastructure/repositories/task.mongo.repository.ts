import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Task } from '../../domain/entities/task.entity';
import { TaskListFilter, TaskRepository } from '../../domain/repositories/task.repository.port';
import { TaskDocument } from '../schemas/task.schema';

@Injectable()
export class TaskMongoRepository
  extends BaseMongoRepository<TaskDocument>
  implements TaskRepository
{
  constructor(@InjectModel(TaskDocument.name) model: Model<TaskDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Task | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter: TaskListFilter = {}): Promise<Task[]> {
    const query: FilterQuery<TaskDocument> = {};
    if (filter.status) query.status = filter.status;
    if (filter.clientId) query.clientId = filter.clientId;
    const docs = await this.findManyScoped(query, { dueDate: 1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(task: Task): Promise<Task> {
    const doc = await this.createScoped({
      _id: task.id,
      clientId: task.clientId,
      clientName: task.clientName,
      agentId: task.agentId,
      agentName: task.agentName,
      description: task.description,
      dueDate: task.dueDate,
      activityLogId: task.activityLogId,
      status: task.status,
      completedById: task.completedById,
      completedByName: task.completedByName,
      completedAt: task.completedAt,
    });
    return this.toDomain(doc);
  }

  async save(task: Task): Promise<Task> {
    const doc = await this.updateOneScoped(
      { _id: task.id },
      {
        status: task.status,
        completedById: task.completedById,
        completedByName: task.completedByName,
        completedAt: task.completedAt,
      },
    );
    if (!doc) throw new Error(`Cannot save Task "${task.id}": document not found`);
    return this.toDomain(doc);
  }

  private toDomain(doc: TaskDocument): Task {
    return Task.reconstitute(
      {
        clientId: doc.clientId,
        clientName: doc.clientName,
        agentId: doc.agentId,
        agentName: doc.agentName,
        description: doc.description,
        dueDate: doc.dueDate,
        activityLogId: doc.activityLogId,
        status: doc.status,
        completedById: doc.completedById,
        completedByName: doc.completedByName,
        completedAt: doc.completedAt,
      },
      doc._id,
    );
  }
}
