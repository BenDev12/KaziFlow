export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/**
 * Thrown by BaseMongoRepository when a query is attempted with no tenant
 * context on the AsyncLocalStorage — this is a programming error (e.g. a
 * repository call outside an authenticated request), not a client input
 * error, so it fails closed rather than silently querying cross-tenant.
 */
export class TenantContextMissingError extends DomainError {
  readonly code = 'TENANT_CONTEXT_MISSING';

  constructor() {
    super('No tenant context is present for this operation');
  }
}
