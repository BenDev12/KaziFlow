import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Cheap presence check only — TenantContextMiddleware already verified the
 * JWT signature/expiry and populated req.user before any guard runs.
 * Splitting the concerns this way means the token is parsed exactly once
 * per request, and the tenant context is available to middleware-level
 * consumers too, not just guarded routes.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
