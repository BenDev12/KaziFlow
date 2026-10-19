import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import { Route, RoutePurpose } from '../../domain/entities/route.entity';
import { ROUTE_REPOSITORY, RouteRepository } from '../../domain/repositories/route.repository.port';

export interface UpdateRouteInput {
  routeId: string;
  requesterId: string;
  canManage: boolean;
  name?: string;
  purpose?: RoutePurpose;
}

/** Whether the requester may reach Routes at all is the controller's office-access gate. */
@Injectable()
export class UpdateRouteUseCase implements UseCase<UpdateRouteInput, Route> {
  constructor(@Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository) {}

  async execute(input: UpdateRouteInput): Promise<Route> {
    const route = await this.routes.findById(input.routeId);
    if (!route) throw new NotFoundError('Route', input.routeId);
    if (!input.canManage && route.agentId !== input.requesterId) {
      throw new ForbiddenError('You can only edit your own route.');
    }

    if (input.name !== undefined) route.rename(input.name);
    if (input.purpose !== undefined) route.changePurpose(input.purpose);
    return this.routes.save(route);
  }
}
