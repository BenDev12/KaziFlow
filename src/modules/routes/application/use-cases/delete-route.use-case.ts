import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from '../../../clients/domain/repositories/client.repository.port';
import { ROUTE_REPOSITORY, RouteRepository } from '../../domain/repositories/route.repository.port';

export interface DeleteRouteInput {
  routeId: string;
  requesterId: string;
  canManage: boolean;
}

/**
 * Used both for a manual delete and for the "round complete" auto-delete
 * once every office on a route has been visited since being added to it
 * (see the dashboard's completion check). Clears the route reference off
 * every office that was on it, so nothing is left pointing at a dead route.
 */
@Injectable()
export class DeleteRouteUseCase implements UseCase<DeleteRouteInput, void> {
  constructor(
    @Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(input: DeleteRouteInput): Promise<void> {
    const route = await this.routes.findById(input.routeId);
    if (!route) throw new NotFoundError('Route', input.routeId);
    if (!input.canManage && route.agentId !== input.requesterId) {
      throw new ForbiddenError('You can only delete your own route.');
    }

    await this.clients.unassignRoute(input.routeId);
    await this.routes.delete(input.routeId);
  }
}
