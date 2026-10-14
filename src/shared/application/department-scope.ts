import { UserRole } from '../infrastructure/tenancy/tenant-context';

/**
 * org_admin always sees the whole org; manager and agent are scoped to
 * their own department. A requester with no department yet (the feature
 * hasn't been adopted for them, or departments aren't set up in this org
 * at all) is treated as unscoped — this is what keeps the feature a pure
 * opt-in: an org that never creates a department sees no behavior change
 * at all, and a user isn't locked out just for not having been assigned
 * one yet. Repositories pair this with a `departmentId: null` OR-clause
 * on records too, so legacy/unassigned records stay visible to everyone.
 */
export function departmentScopeFor(
  role: UserRole,
  departmentId: string | null,
): string | undefined {
  if (role === 'org_admin') return undefined;
  return departmentId ?? undefined;
}

/**
 * Same rule as `departmentScopeFor`, applied to a single already-fetched
 * record rather than a list query — used by get/update/delete use-cases so
 * the boundary a list enforces can't just be bypassed by guessing an id.
 */
export function canAccessDepartmentScopedRecord(
  recordDepartmentId: string | null,
  role: UserRole,
  requesterDepartmentId: string | null,
): boolean {
  if (role === 'org_admin') return true;
  if (recordDepartmentId === null) return true;
  return recordDepartmentId === requesterDepartmentId;
}
