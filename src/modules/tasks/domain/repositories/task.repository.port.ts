import { Task, TaskStatus } from '../entities/task.entity';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskListFilter {
  status?: TaskStatus;
  clientId?: string;
  /** Set by the use-case from the requester's role — see department-scope.ts. Not a public query param. */
  departmentId?: string;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskListFilter): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  save(task: Task): Promise<Task>;
}
