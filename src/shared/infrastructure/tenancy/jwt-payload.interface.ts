import { UserRole } from './tenant-context';

/** Claims carried by both the access and refresh tokens. */
export interface JwtPayload {
  sub: string; // userId
  orgId: string;
  role: UserRole;
  email: string;
  name: string;
}
