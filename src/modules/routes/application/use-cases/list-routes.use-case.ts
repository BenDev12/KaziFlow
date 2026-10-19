import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case.interface';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { Route } from '../../domain/entities/route.entity';
import { ROUTE_REPOSITORY, RouteRepository } from '../../domain/repositories/route.repository.port';

export interface ListRoutesInput {
  role: UserRole;
  userId: string;
}

/**
 * Admins/managers see every route in the org (to build/reassign coverage).
 * Agents see only their own route plus unassigned ones — the "pick an
 * existing route" pool — never a route already claimed by a teammate.
 */
@Injectable()
export class ListRoutesUseCase implements UseCase<ListRoutesInput, Route[]> {
  constructor(@Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository) {}

  async execute(input: ListRoutesInput): Promise<Route[]> {
    const all = await this.routes.findAll();
    if (input.role === 'org_admin' || input.role === 'manager') return all;
    return all.filter((r) => r.agentId === input.userId || r.agentId === null);
  }
}
