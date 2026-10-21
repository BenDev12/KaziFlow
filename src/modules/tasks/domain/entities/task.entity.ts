import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain-error';
import { TaskCompletedEvent } from '../events/task-completed.event';

export type TaskStatus = 'pending' | 'awaiting_approval' | 'completed';
export type TaskPriority = 'normal' | 'urgent';
/** Where the work came from — captures the basic call/email/walk-in logging distinct from a full "request" entity. */
export type TaskSource = 'internal' | 'phone_call' | 'email' | 'walk_in' | 'whatsapp';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskLink {
  label: string;
  url: string;
}

export interface TaskNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface TaskProps {
  /** Null for a general task not tied to any specific client/office. */
  clientId: string | null;
  clientName: string | null;
  agentId: string;
  agentName: string;
  /** The creating agent's department at the time (or a template stage's department) — see shared/application/department-scope.ts. */
  departmentId: string | null;
  title: string;
  /** Optional detail text — the task's headline lives in `title`. */
  description: string | null;
  dueDate: Date | null;
  priority: TaskPriority;
  source: TaskSource;
  /** Nullable because a task spawned by workflow advancement isn't tied to a fresh visit log — see parentTaskId instead. */
  activityLogId: string | null;
  status: TaskStatus;
  /** Null for a plain, one-off task (today's behavior, unchanged). Set when created from a WorkflowTemplate stage. */
  templateId: string | null;
  stageId: string | null;
  /** If true, the assignee's completion only submits for approval — see submitForApproval()/approve(). */
  requiresApproval: boolean;
  checklistItems: ChecklistItem[];
  assignedToUserId: string | null;
  assignedToName: string | null;
  links: TaskLink[];
  /** A running log of context/questions — anyone who can see the task may add one; it never changes status. */
  notes: TaskNote[];
  /** The task whose completion/approval spawned this one, if any (workflow provenance). */
  parentTaskId: string | null;
  submittedForApprovalById: string | null;
  submittedForApprovalByName: string | null;
  submittedForApprovalAt: Date | null;
  completedById: string | null;
  completedByName: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

export class Task extends AggregateRoot<TaskProps> {
  private constructor(props: TaskProps, id: string) {
    super(props, id);
  }

  static create(
    props: {
      clientId?: string | null;
      clientName?: string | null;
      agentId: string;
      agentName: string;
      departmentId: string | null;
      title: string;
      description?: string | null;
      dueDate?: Date | null;
      priority?: TaskPriority;
      source?: TaskSource;
      activityLogId: string | null;
      templateId?: string | null;
      stageId?: string | null;
      requiresApproval?: boolean;
      checklistItems?: ChecklistItem[];
      assignedToUserId?: string | null;
      assignedToName?: string | null;
      links?: TaskLink[];
      parentTaskId?: string | null;
    },
    id: string,
  ): Task {
    if (!props.title.trim()) throw new ValidationError('Task title is required');

    return new Task(
      {
        clientId: props.clientId ?? null,
        clientName: props.clientName ?? null,
        agentId: props.agentId,
        agentName: props.agentName,
        departmentId: props.departmentId,
        title: props.title.trim(),
        description: props.description?.trim() || null,
        dueDate: props.dueDate ?? null,
        priority: props.priority ?? 'normal',
        source: props.source ?? 'internal',
        activityLogId: props.activityLogId,
        status: 'pending',
        templateId: props.templateId ?? null,
        stageId: props.stageId ?? null,
        requiresApproval: props.requiresApproval ?? false,
        checklistItems: props.checklistItems ?? [],
        assignedToUserId: props.assignedToUserId ?? null,
        assignedToName: props.assignedToName ?? null,
        links: props.links ?? [],
        notes: [],
        parentTaskId: props.parentTaskId ?? null,
        submittedForApprovalById: null,
        submittedForApprovalByName: null,
        submittedForApprovalAt: null,
        completedById: null,
        completedByName: null,
        completedAt: null,
        createdAt: new Date(),
      },
      id,
    );
  }

  static reconstitute(props: TaskProps, id: string): Task {
    return new Task(props, id);
  }

  assign(input: { userId: string; userName: string }): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('Only a pending task can be (re)assigned');
    }
    this.props.assignedToUserId = input.userId;
    this.props.assignedToName = input.userName;
  }

  /** Pure context — available at any status, to anyone who can already see the task (enforced by the use-case, not here). */
  addNote(input: { id: string; byId: string; byName: string; text: string }): void {
    if (!input.text.trim()) throw new ValidationError('Note text is required');
    this.props.notes.push({
      id: input.id,
      authorId: input.byId,
      authorName: input.byName,
      text: input.text.trim(),
      createdAt: new Date(),
    });
  }

  toggleChecklistItem(itemId: string, done: boolean): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('This task is no longer open for checklist changes');
    }
    const item = this.props.checklistItems.find((i) => i.id === itemId);
    if (!item) throw new ValidationError(`Checklist item "${itemId}" was not found on this task`);
    item.done = done;
  }

  /** The assignee's path when their stage requires approval — the work is done, but not yet final. */
  submitForApproval(input: { byId: string; byName: string }): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError('This task is no longer pending');
    }
    this.props.status = 'awaiting_approval';
    this.props.submittedForApprovalById = input.byId;
    this.props.submittedForApprovalByName = input.byName;
    this.props.submittedForApprovalAt = new Date();
  }

  /** A department manager (or org_admin) signing off on a submitted task — finishes it and fires the same event complete() does. */
  approve(input: { byId: string; byName: string; orgId: string }): void {
    if (this.props.status !== 'awaiting_approval') {
      throw new ConflictError('This task is not awaiting approval');
    }
    this.props.status = 'completed';
    this.props.completedById = input.byId;
    this.props.completedByName = input.byName;
    this.props.completedAt = new Date();

    this.addDomainEvent(
      new TaskCompletedEvent(input.orgId, this.id, this.props.clientId, input.byId),
    );
  }

  /**
   * The direct-finish path — the assignee when no approval is required, or
   * a department manager/org_admin closing it themselves at any time
   * (skips the approval step entirely, since their own completion already
   * carries that authority).
   */
  complete(input: { byId: string; byName: string; orgId: string }): void {
    if (this.props.status === 'completed') {
      throw new ConflictError('This task is already completed');
    }
    if (this.props.status === 'awaiting_approval') {
      throw new ConflictError('This task is awaiting approval — use approve() instead');
    }

    this.props.status = 'completed';
    this.props.completedById = input.byId;
    this.props.completedByName = input.byName;
    this.props.completedAt = new Date();

    this.addDomainEvent(
      new TaskCompletedEvent(input.orgId, this.id, this.props.clientId, input.byId),
    );
  }

  get clientId(): string | null {
    return this.props.clientId;
  }

  get clientName(): string | null {
    return this.props.clientName;
  }

  get agentId(): string {
    return this.props.agentId;
  }

  get agentName(): string {
    return this.props.agentName;
  }

  get departmentId(): string | null {
    return this.props.departmentId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get dueDate(): Date | null {
    return this.props.dueDate;
  }

  get priority(): TaskPriority {
    return this.props.priority;
  }

  get source(): TaskSource {
    return this.props.source;
  }

  get activityLogId(): string | null {
    return this.props.activityLogId;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get templateId(): string | null {
    return this.props.templateId;
  }

  get stageId(): string | null {
    return this.props.stageId;
  }

  get requiresApproval(): boolean {
    return this.props.requiresApproval;
  }

  get checklistItems(): ChecklistItem[] {
    return this.props.checklistItems;
  }

  get assignedToUserId(): string | null {
    return this.props.assignedToUserId;
  }

  get assignedToName(): string | null {
    return this.props.assignedToName;
  }

  get links(): TaskLink[] {
    return this.props.links;
  }

  get notes(): TaskNote[] {
    return this.props.notes;
  }

  get parentTaskId(): string | null {
    return this.props.parentTaskId;
  }

  get submittedForApprovalById(): string | null {
    return this.props.submittedForApprovalById;
  }

  get submittedForApprovalByName(): string | null {
    return this.props.submittedForApprovalByName;
  }

  get submittedForApprovalAt(): Date | null {
    return this.props.submittedForApprovalAt;
  }

  get completedById(): string | null {
    return this.props.completedById;
  }

  get completedByName(): string | null {
    return this.props.completedByName;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
