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
    if (filter.assignedToUserId) query.assignedToUserId = filter.assignedToUserId;
    if (filter.departmentId) {
      // Records with no department (created before departments existed, or
      // by an unassigned member) stay visible to everyone — only a record
      // explicitly tagged with a DIFFERENT department is hidden.
      query.$or = [{ departmentId: filter.departmentId }, { departmentId: null }];
    }
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
      departmentId: task.departmentId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      source: task.source,
      activityLogId: task.activityLogId,
      status: task.status,
      templateId: task.templateId,
      stageId: task.stageId,
      requiresApproval: task.requiresApproval,
      checklistItems: task.checklistItems,
      assignedToUserId: task.assignedToUserId,
      assignedToName: task.assignedToName,
      links: task.links,
      notes: task.notes,
      history: task.history,
      parentTaskId: task.parentTaskId,
      submittedForApprovalById: task.submittedForApprovalById,
      submittedForApprovalByName: task.submittedForApprovalByName,
      submittedForApprovalAt: task.submittedForApprovalAt,
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
        checklistItems: task.checklistItems,
        assignedToUserId: task.assignedToUserId,
        assignedToName: task.assignedToName,
        notes: task.notes,
        history: task.history,
        submittedForApprovalById: task.submittedForApprovalById,
        submittedForApprovalByName: task.submittedForApprovalByName,
        submittedForApprovalAt: task.submittedForApprovalAt,
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
        departmentId: doc.departmentId,
        title: doc.title,
        description: doc.description,
        dueDate: doc.dueDate,
        priority: doc.priority,
        source: doc.source,
        activityLogId: doc.activityLogId,
        status: doc.status,
        templateId: doc.templateId,
        stageId: doc.stageId,
        requiresApproval: doc.requiresApproval,
        checklistItems: doc.checklistItems.map((i) => ({ id: i.id, label: i.label, done: i.done })),
        assignedToUserId: doc.assignedToUserId,
        assignedToName: doc.assignedToName,
        links: doc.links.map((l) => ({ label: l.label, url: l.url })),
        notes: doc.notes.map((n) => ({
          id: n.id,
          authorId: n.authorId,
          authorName: n.authorName,
          text: n.text,
          createdAt: n.createdAt,
        })),
        history: doc.history.map((h) => ({
          id: h.id,
          type: h.type,
          byId: h.byId,
          byName: h.byName,
          note: h.note,
          createdAt: h.createdAt,
        })),
        parentTaskId: doc.parentTaskId,
        submittedForApprovalById: doc.submittedForApprovalById,
        submittedForApprovalByName: doc.submittedForApprovalByName,
        submittedForApprovalAt: doc.submittedForApprovalAt,
        completedById: doc.completedById,
        completedByName: doc.completedByName,
        completedAt: doc.completedAt,
        createdAt: doc.createdAt,
      },
      doc._id,
    );
  }
}
