import { Inject, Injectable } from '@nestjs/common';
import {
  REALTIME_PUBLISHER,
  RealtimePublisher,
} from '../../../../shared/application/ports/realtime-publisher.port';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Issue } from '../../domain/entities/issue.entity';
import { IssueListFilter, IssueRepository } from '../../domain/repositories/issue.repository.port';
import { IssueMongoRepository } from '../../infrastructure/repositories/issue.mongo.repository';
import { toIssueResponse } from '../presenters/issue.presenter';

/**
 * ISSUE_REPOSITORY binding: delegates to IssueMongoRepository and pushes
 * every successful create/save out as an `issue.created` / `issue.updated`
 * realtime event. See RealtimeTaskRepository for why this hooks the
 * repository rather than each use-case.
 */
@Injectable()
export class RealtimeIssueRepository implements IssueRepository {
  constructor(
    private readonly inner: IssueMongoRepository,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisher,
  ) {}

  findById(id: string): Promise<Issue | null> {
    return this.inner.findById(id);
  }

  findAll(filter?: IssueListFilter): Promise<Issue[]> {
    return this.inner.findAll(filter);
  }

  async create(issue: Issue): Promise<Issue> {
    const created = await this.inner.create(issue);
    this.broadcast('issue.created', created);
    return created;
  }

  async save(issue: Issue): Promise<Issue> {
    const saved = await this.inner.save(issue);
    this.broadcast('issue.updated', saved);
    return saved;
  }

  private broadcast(event: string, issue: Issue): void {
    this.publisher.publish({
      orgId: TenantContext.get().orgId,
      event,
      departmentId: issue.departmentId,
      data: toIssueResponse(issue),
    });
  }
}
