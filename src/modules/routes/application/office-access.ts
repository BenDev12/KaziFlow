import { UserRole } from '../../../shared/infrastructure/tenancy/tenant-context';
import { Department } from '../../departments/domain/entities/department.entity';

/**
 * Routes are an Offices feature — same gate as clients/application/office-access.ts,
 * duplicated rather than imported to avoid a Clients<->Routes module cycle
 * (ClientsModule already imports RoutesModule for the assign-route endpoint).
 */
function isSalesOrFieldDepartment(department: Pick<Department, 'name'>): boolean {
  return /sales|field/i.test(department.name);
}

export function canAccessOffices(
  role: UserRole,
  departmentId: string | null,
  departments: Pick<Department, 'id' | 'name'>[],
): boolean {
  if (role === 'org_admin' || role === 'manager') return true;
  if (!departmentId) return false;
  return departments.some((d) => d.id === departmentId && isSalesOrFieldDepartment(d));
}
