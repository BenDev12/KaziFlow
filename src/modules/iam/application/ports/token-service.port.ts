import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenClaims {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  name: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenService {
  issueTokenPair(claims: TokenClaims): TokenPair;
  verifyRefreshToken(token: string): TokenClaims;
}
