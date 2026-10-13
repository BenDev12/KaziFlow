import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Blocks every domain-module route (clients/activities/issues/tasks/flags/
 * analytics) until the user has completed org onboarding — a user's JWT
 * carries an empty `orgId` claim between signup and POST /v1/org, and
 * BaseMongoRepository would otherwise happily (and uselessly) scope
 * queries by an empty string. Runs after JwtAuthGuard.
 */
@Injectable()
export class RequireOrgGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user?.orgId) {
      throw new ForbiddenException(
        'Complete organization onboarding before accessing this resource',
      );
    }
    return true;
  }
}
