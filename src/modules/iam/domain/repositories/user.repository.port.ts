import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * Deliberately global (email lookup, not org-scoped): a user may exist
 * with no org yet (post-signup, pre-onboarding) and login has no
 * org-selection step, so a user must be resolvable by email alone.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<User>;
  save(user: User): Promise<User>;
  /** Used to block deleting a department that still has members assigned. */
  countInDepartment(departmentId: string): Promise<number>;
}
