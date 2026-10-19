import { Route } from '../entities/route.entity';

export const ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY');

export interface RouteRepository {
  findById(id: string): Promise<Route | null>;
  /** At most one route is ever assigned to a given agent at a time — see CreateRouteUseCase/ClaimRouteUseCase. */
  findByAgentId(agentId: string): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  create(route: Route): Promise<Route>;
  save(route: Route): Promise<Route>;
  delete(id: string): Promise<boolean>;
}
