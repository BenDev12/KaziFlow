import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { TokenClaims, TokenPair, TokenService } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  issueTokenPair(claims: TokenClaims): TokenPair {
    const payload: JwtPayload = {
      sub: claims.userId,
      orgId: claims.orgId,
      role: claims.role,
      email: claims.email,
      name: claims.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL'),
    });

    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string): TokenClaims {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
  }
}
