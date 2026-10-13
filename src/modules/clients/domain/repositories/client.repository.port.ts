import { CallCycle, Client, ClientPriority } from '../entities/client.entity';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientListFilter {
  priority?: ClientPriority;
  callCycle?: CallCycle;
  search?: string;
}

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findAll(filter?: ClientListFilter): Promise<Client[]>;
  create(client: Client): Promise<Client>;
  save(client: Client): Promise<Client>;
  delete(id: string): Promise<boolean>;
}
