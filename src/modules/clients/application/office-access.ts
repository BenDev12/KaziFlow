import { UserRole } from '../../../shared/infrastructure/tenancy/tenant-context';
import { Department } from '../../departments/domain/entities/department.entity';

/**
 * Offices (clients) are a sales/field-team feature. Departments have no
 * explicit "is the field team" flag, so this matches by name — admins
 * name departments freely, but "Sales" or "Field" in the name is the
 * convention this org (and the automation templates) already follow.
 */
export function isSalesOrFieldDepartment(department: Pick<Department, 'name'>): boolean {
  return /sales|field/i.test(department.name);
}

/**
 * Who may open Offices at all: org admins (see everything, as always),
 * any manager regardless of their own department (so leadership can
 * oversee client coverage org-wide), and every member — any role — of
 * whichever department is the org's sales/field team. Everyone else gets
 * no access, not just a filtered view.
 */
export function canAccessOffices(
  role: UserRole,
  departmentId: string | null,
  departments: Pick<Department, 'id' | 'name'>[],
): boolean {
  if (role === 'org_admin' || role === 'manager') return true;
  if (!departmentId) return false;
  return departments.some((d) => d.id === departmentId && isSalesOrFieldDepartment(d));
}
