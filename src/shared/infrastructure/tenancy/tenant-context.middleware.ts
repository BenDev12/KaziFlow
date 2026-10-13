import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';
import { JwtPayload } from './jwt-payload.interface';
import { ACCESS_TOKEN_COOKIE } from './cookie-names';

/**
 * Verifies the access-token cookie (if present) and, when valid, runs the
 * rest of the request inside TenantContext.run(). Deliberately does NOT
 * reject the request on a missing/invalid token — that is JwtAuthGuard's
 * job — so public routes (login, signup) pass through untouched while
 * still giving every downstream layer (guards, use-cases, repositories) a
 * populated tenant context for free on authenticated routes.
 *
 * Verifies with an explicit secret (rather than relying on JwtModule's
 * default) so this works regardless of how/where JwtModule is registered.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

    if (!token) {
      next();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      req.user = payload;
      TenantContext.run(
        { orgId: payload.orgId, userId: payload.sub, role: payload.role, email: payload.email },
        next,
      );
    } catch {
      // Invalid/expired token: leave context unset, let JwtAuthGuard reject downstream.
      next();
    }
  }
}
