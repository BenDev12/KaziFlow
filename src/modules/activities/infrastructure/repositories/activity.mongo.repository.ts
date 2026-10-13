import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseMongoRepository } from '../../../../shared/infrastructure/database/base-mongo.repository';
import { Activity } from '../../domain/entities/activity.entity';
import {
  ActivityListFilter,
  ActivityRepository,
} from '../../domain/repositories/activity.repository.port';
import { ActivityDocument } from '../schemas/activity.schema';

@Injectable()
export class ActivityMongoRepository
  extends BaseMongoRepository<ActivityDocument>
  implements ActivityRepository
{
  constructor(@InjectModel(ActivityDocument.name) model: Model<ActivityDocument>) {
    super(model);
  }

  async findById(id: string): Promise<Activity | null> {
    const doc = await this.findOneScoped({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter: ActivityListFilter = {}): Promise<Activity[]> {
    const query: FilterQuery<ActivityDocument> = {};
    if (filter.clientId) query.clientId = filter.clientId;
    if (filter.agentId) query.agentId = filter.agentId;
    if (filter.from || filter.to) {
      query.loggedAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }
    const docs = await this.findManyScoped(query, { loggedAt: -1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(activity: Activity): Promise<Activity> {
    const doc = await this.createScoped({
      _id: activity.id,
      clientId: activity.clientId,
      clientName: activity.clientName,
      agentId: activity.agentId,
      agentName: activity.agentName,
      activityType: activity.activityType,
      personSpokenTo: activity.personSpokenTo,
      notes: activity.notes,
      raisedIssue: activity.raisedIssue,
      createdTask: activity.createdTask,
      loggedAt: activity.loggedAt,
    });
    return this.toDomain(doc);
  }

  private toDomain(doc: ActivityDocument): Activity {
    return Activity.reconstitute(
      {
        clientId: doc.clientId,
        clientName: doc.clientName,
        agentId: doc.agentId,
        agentName: doc.agentName,
        activityType: doc.activityType,
        personSpokenTo: doc.personSpokenTo,
        notes: doc.notes,
        raisedIssue: doc.raisedIssue,
        createdTask: doc.createdTask,
        loggedAt: doc.loggedAt,
      },
      doc._id,
    );
  }
}
