import { Flag, FlagStatus } from '../entities/flag.entity';

export const FLAG_REPOSITORY = Symbol('FLAG_REPOSITORY');

export interface FlagListFilter {
  status?: FlagStatus;
  clientId?: string;
  /** Set by the use-case from the requester's role — see department-scope.ts. Not a public query param. */
  departmentId?: string;
}

export interface FlagRepository {
  findById(id: string): Promise<Flag | null>;
  findAll(filter?: FlagListFilter): Promise<Flag[]>;
  create(flag: Flag): Promise<Flag>;
  save(flag: Flag): Promise<Flag>;
}
