import { Department } from '../entities/department.entity';

export const DEPARTMENT_REPOSITORY = Symbol('DEPARTMENT_REPOSITORY');

export interface DepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findByName(name: string): Promise<Department | null>;
  findAll(): Promise<Department[]>;
  create(department: Department): Promise<Department>;
  delete(id: string): Promise<boolean>;
  /**
   * Unscoped — the ONLY method here that doesn't require TenantContext.
   * Exists for the public invite-preview flow (GetInviteByTokenUseCase),
   * which runs before the invitee has any session at all. Every other
   * caller must go through `findById`, which is tenant-scoped.
   */
  findByIdUnscoped(id: string): Promise<Department | null>;
}
