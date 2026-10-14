import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantContextMissingError } from '../../domain/errors/domain-error';

export type UserRole = 'org_admin' | 'manager' | 'agent';

export interface TenantStore {
  orgId: string;
  userId: string;
  role: UserRole;
  email: string;
  departmentId: string | null;
}

/**
 * Request-scoped tenant/user identity, propagated via AsyncLocalStorage
 * rather than Nest's REQUEST scope so that plain domain/application code
 * (repositories, use-cases) can read it without being injected with the
 * HTTP request object — keeping those layers framework-agnostic.
 *
 * TenantContextMiddleware is the only writer. BaseMongoRepository is the
 * primary reader: it fails closed (throws) if no store is present, so a
 * repository call can never silently run unscoped.
 */
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  static run<T>(store: TenantStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  static get(): TenantStore {
    const store = this.storage.getStore();
    if (!store) {
      throw new TenantContextMissingError();
    }
    return store;
  }

  static tryGet(): TenantStore | undefined {
    return this.storage.getStore();
  }
}
