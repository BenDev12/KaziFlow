import { Invite } from '../entities/invite.entity';

export const INVITE_REPOSITORY = Symbol('INVITE_REPOSITORY');

export interface InviteRepository {
  findById(id: string): Promise<Invite | null>;
  /** Deliberately global, like User.findByEmail — the accept flow has no tenant context yet. */
  findByToken(token: string): Promise<Invite | null>;
  findPendingByOrgAndEmail(orgId: string, email: string): Promise<Invite | null>;
  findByOrg(orgId: string): Promise<Invite[]>;
  create(invite: Invite): Promise<Invite>;
  save(invite: Invite): Promise<Invite>;
}
