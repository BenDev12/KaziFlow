import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { Route, RoutePurpose } from '../../domain/entities/route.entity';
import { ROUTE_REPOSITORY, RouteRepository } from '../../domain/repositories/route.repository.port';

export interface CreateRouteInput {
  name: string;
  purpose: RoutePurpose;
  agentId: string;
  agentName: string;
}

/** An agent owns at most one route at a time — creating a new one replaces whichever they already had. */
@Injectable()
export class CreateRouteUseCase implements UseCase<CreateRouteInput, Route> {
  constructor(@Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository) {}

  async execute(input: CreateRouteInput): Promise<Route> {
    const existing = await this.routes.findByAgentId(input.agentId);
    if (existing) {
      existing.unassign();
      await this.routes.save(existing);
    }
    const route = Route.create(input, randomUUID());
    return this.routes.create(route);
  }
}
