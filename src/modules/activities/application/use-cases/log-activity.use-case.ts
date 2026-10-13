import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import { Activity, ActivityType } from '../../domain/entities/activity.entity';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/repositories/activity.repository.port';

export interface LogActivityInput {
  clientId: string;
  agentId: string;
  agentName: string;
  activityType: ActivityType;
  personSpokenTo: string;
  notes: string;
  raisedIssue?: boolean;
  createdTask?: boolean;
}

/**
 * Orchestrates across the Clients aggregate too: logging a visit also
 * updates the client's lastVisit/lastNotes/status, and the UI expects
 * that to be reflected immediately (same request), so this happens
 * synchronously here rather than via an eventually-consistent event.
 */
@Injectable()
export class LogActivityUseCase implements UseCase<LogActivityInput, Activity> {
  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(input: LogActivityInput): Promise<Activity> {
    const client = await this.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId);

    const activity = Activity.log(
      { ...input, clientId: client.id, clientName: client.name },
      randomUUID(),
    );
    const saved = await this.activities.create(activity);

    client.recordVisit(saved.loggedAt, saved.notes);
    await this.clients.save(client);

    return saved;
  }
}
