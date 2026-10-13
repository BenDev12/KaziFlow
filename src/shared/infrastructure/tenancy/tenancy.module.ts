import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantContextMiddleware } from './tenant-context.middleware';

/**
 * Global so any module can inject JwtService without re-importing
 * JwtModule, and so AppModule can wire TenantContextMiddleware into every
 * route without IamModule needing to export its internals.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TenantContextMiddleware],
  exports: [JwtModule, TenantContextMiddleware],
})
export class TenancyModule {}
