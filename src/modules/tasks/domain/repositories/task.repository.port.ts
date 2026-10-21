import { Task, TaskStatus } from '../entities/task.entity';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskListFilter {
  status?: TaskStatus;
  clientId?: string;
  assignedToUserId?: string;
  /** Set by the use-case from the requester's role — see department-scope.ts. Not a public query param. */
  departmentId?: string;
  /**
   * Widens (never narrows) visibility to also include every task whose
   * `agentId` — the ORIGINAL requester, carried through a whole workflow
   * chain by AdvanceWorkflowService — matches this id. Lets the person who
   * raised a multi-stage request keep seeing it as it moves through other
   * departments, even ones they're not a member of. Only matters alongside
   * `departmentId`; org_admin already sees everything with no filter at all.
   */
  visibleToUserId?: string;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskListFilter): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  save(task: Task): Promise<Task>;
}
