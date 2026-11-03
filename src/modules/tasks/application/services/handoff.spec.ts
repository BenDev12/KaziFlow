import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import {
  WorkflowStageProps,
  WorkflowTemplate,
} from '../../../workflow-templates/domain/entities/workflow-template.entity';
import { WorkflowTemplateRepository } from '../../../workflow-templates/domain/repositories/workflow-template.repository.port';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository.port';
import { AdvanceWorkflowService } from './advance-workflow.service';
import { HandoffSweeperService } from './handoff-sweeper.service';
import { TaskNotificationsService } from './task-notifications.service';

function stage(id: string, nextStageIds: string[] = []): WorkflowStageProps {
  return {
    id,
    name: `Stage ${id}`,
    departmentId: `dept-${id}`,
    requiresApproval: false,
    checklistTemplate: [],
    nextStageIds,
    position: null,
  };
}

/** "a" fans out to "b" and "c". */
const template = WorkflowTemplate.create(
  {
    orgId: 'org-1',
    name: 'Order',
    entryStageId: 'a',
    stages: [stage('a', ['b', 'c']), stage('b'), stage('c')],
  },
  'template-1',
);

class FakeTaskRepository implements TaskRepository {
  readonly tasks = new Map<string, Task>();
  readonly orgOf = new Map<string, string>();
  /** Make the Nth create() call throw, to simulate the process dying mid-hand-off. */
  failOnCreateNumber: number | null = null;
  private creates = 0;

  async findById(id: string) {
    return this.tasks.get(id) ?? null;
  }
  async findAll() {
    return [...this.tasks.values()];
  }
  async create(task: Task) {
    this.creates += 1;
    if (this.creates === this.failOnCreateNumber) throw new Error('process died');
    this.tasks.set(task.id, task);
    this.orgOf.set(task.id, TenantContext.tryGet()?.orgId ?? 'org-1');
    return task;
  }
  async save(task: Task) {
    this.tasks.set(task.id, task);
    return task;
  }
  async markHandoffDone(id: string) {
    const task = this.tasks.get(id)!;
    this.tasks.set(id, Task.reconstitute({ ...snapshot(task), handoffPending: false }, id));
  }
  async findPendingHandoffsAcrossOrgs(completedBefore: Date) {
    return [...this.tasks.values()]
      .filter((t) => t.handoffPending && t.completedAt! < completedBefore)
      .map((task) => ({ orgId: 'org-1', task }));
  }
  childrenOf(parentId: string) {
    return [...this.tasks.values()].filter((t) => t.parentTaskId === parentId);
  }
}

function snapshot(task: Task) {
  return (task as unknown as { props: Parameters<typeof Task.reconstitute>[0] }).props;
}

function build() {
  const tasks = new FakeTaskRepository();
  const templates = { findById: async () => template } as unknown as WorkflowTemplateRepository;
  const notifications = {
    taskCreated: async () => undefined,
  } as unknown as TaskNotificationsService;
  const advance = new AdvanceWorkflowService(tasks, templates, notifications);
  return { tasks, advance, sweeper: new HandoffSweeperService(tasks, advance) };
}

async function finishedStageA(tasks: FakeTaskRepository): Promise<Task> {
  const task = Task.create(
    {
      agentId: 'user-1',
      agentName: 'Ann',
      departmentId: 'dept-a',
      title: 'Stage a',
      activityLogId: null,
      templateId: template.id,
      stageId: 'a',
    },
    'task-a',
  );
  task.complete({ byId: 'user-1', byName: 'Ann', orgId: 'org-1', historyId: 'h1' });
  tasks.tasks.set(task.id, task);
  return task;
}

describe('workflow hand-off safety', () => {
  it('flags a finished workflow task until its hand-off is done, then clears it', async () => {
    const { tasks, advance } = build();
    const finished = await finishedStageA(tasks);
    expect(finished.handoffPending).toBe(true);

    await advance.advance(finished);

    expect(
      tasks
        .childrenOf('task-a')
        .map((t) => t.stageId)
        .sort(),
    ).toEqual(['b', 'c']);
    expect(tasks.tasks.get('task-a')!.handoffPending).toBe(false);
  });

  it('leaves the flag set when the hand-off dies halfway, and a retry finishes it without duplicates', async () => {
    const { tasks, advance } = build();
    const finished = await finishedStageA(tasks);
    tasks.failOnCreateNumber = 2; // "b" gets created, then the process dies before "c"

    await advance.advanceOrLeaveForSweeper(finished); // the user's request still succeeds
    expect(tasks.childrenOf('task-a').map((t) => t.stageId)).toEqual(['b']);
    expect(tasks.tasks.get('task-a')!.handoffPending).toBe(true);

    await advance.advance(tasks.tasks.get('task-a')!);
    await advance.advance(tasks.tasks.get('task-a')!); // even a third run changes nothing

    expect(
      tasks
        .childrenOf('task-a')
        .map((t) => t.stageId)
        .sort(),
    ).toEqual(['b', 'c']);
    expect(tasks.tasks.get('task-a')!.handoffPending).toBe(false);
  });

  it('sweeper finishes hand-offs stuck past the grace period, inside the task’s own org', async () => {
    const { tasks, advance, sweeper } = build();
    const finished = await finishedStageA(tasks);
    tasks.failOnCreateNumber = 1;
    await advance.advanceOrLeaveForSweeper(finished);
    expect(tasks.childrenOf('task-a')).toHaveLength(0);

    // Within the grace period the request might still be handing off itself — leave it alone.
    await sweeper.sweep(new Date(finished.completedAt!.getTime() + 30_000));
    expect(tasks.childrenOf('task-a')).toHaveLength(0);

    await sweeper.sweep(new Date(finished.completedAt!.getTime() + 2 * 60_000));
    expect(
      tasks
        .childrenOf('task-a')
        .map((t) => t.stageId)
        .sort(),
    ).toEqual(['b', 'c']);
    expect(tasks.childrenOf('task-a').every((t) => tasks.orgOf.get(t.id) === 'org-1')).toBe(true);
    expect(tasks.tasks.get('task-a')!.handoffPending).toBe(false);
  });

  it('never flags a plain (non-workflow) task', () => {
    const task = Task.create(
      { agentId: 'u', agentName: 'U', departmentId: null, title: 'Plain', activityLogId: null },
      'plain',
    );
    task.complete({ byId: 'u', byName: 'U', orgId: 'org-1', historyId: 'h' });
    expect(task.handoffPending).toBe(false);
  });
});
