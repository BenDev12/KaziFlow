import { CallCycle, Client, ClientPriority } from '../entities/client.entity';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientListFilter {
  priority?: ClientPriority;
  callCycle?: CallCycle;
  search?: string;
  /** Set by the use-case from the requester's role — see department-scope.ts. Not a public query param. */
  departmentId?: string;
}

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findAll(filter?: ClientListFilter): Promise<Client[]>;
  create(client: Client): Promise<Client>;
  save(client: Client): Promise<Client>;
  delete(id: string): Promise<boolean>;
  /** Clears routeId/routeAddedAt on every client currently on this route — used when a route is deleted. */
  unassignRoute(routeId: string): Promise<void>;
}
