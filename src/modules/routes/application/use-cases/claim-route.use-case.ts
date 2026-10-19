import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Route } from '../../domain/entities/route.entity';
import { ROUTE_REPOSITORY, RouteRepository } from '../../domain/repositories/route.repository.port';

export interface ClaimRouteInput {
  routeId: string;
  agentId: string;
  agentName: string;
}

/** Picking an existing, unassigned route — an agent still owns at most one at a time. */
@Injectable()
export class ClaimRouteUseCase implements UseCase<ClaimRouteInput, Route> {
  constructor(@Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository) {}

  async execute(input: ClaimRouteInput): Promise<Route> {
    const route = await this.routes.findById(input.routeId);
    if (!route) throw new NotFoundError('Route', input.routeId);
    if (route.agentId && route.agentId !== input.agentId) {
      throw new ConflictError('This route is already assigned to someone else.');
    }

    const previous = await this.routes.findByAgentId(input.agentId);
    if (previous && previous.id !== route.id) {
      previous.unassign();
      await this.routes.save(previous);
    }

    route.assignTo(input.agentId, input.agentName);
    return this.routes.save(route);
  }
}
