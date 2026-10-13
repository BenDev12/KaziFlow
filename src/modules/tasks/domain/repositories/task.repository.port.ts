import { Task, TaskStatus } from '../entities/task.entity';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskListFilter {
  status?: TaskStatus;
  clientId?: string;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskListFilter): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  save(task: Task): Promise<Task>;
}
