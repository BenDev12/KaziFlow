import { Task } from './task.entity';

function buildTask(overrides?: Partial<Parameters<typeof Task.create>[0]>) {
  return Task.create(
    {
      clientId: 'client-1',
      clientName: 'Acme',
      agentId: 'agent-1',
      agentName: 'Alex Agent',
      departmentId: 'dept-sales',
      title: 'Call the client',
      activityLogId: 'activity-1',
      ...overrides,
    },
    'task-1',
  );
}

describe('Task', () => {
  describe('assign', () => {
    it('sets the assignee while pending', () => {
      const task = buildTask();
      task.assign({ userId: 'user-1', userName: 'Agent One' });

      expect(task.assignedToUserId).toBe('user-1');
      expect(task.assignedToName).toBe('Agent One');
    });

    it('refuses to (re)assign a completed task', () => {
      const task = buildTask();
      task.complete({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1', historyId: 'h-1' });

      expect(() => task.assign({ userId: 'user-1', userName: 'Agent One' })).toThrow(
        'Only a pending task can be (re)assigned',
      );
    });
  });

  describe('toggleChecklistItem', () => {
    it('checks and unchecks an item by id', () => {
      const task = buildTask({
        checklistItems: [{ id: 'item-1', label: 'Call client', done: false }],
      });

      task.toggleChecklistItem('item-1', true);
      expect(task.checklistItems[0].done).toBe(true);

      task.toggleChecklistItem('item-1', false);
      expect(task.checklistItems[0].done).toBe(false);
    });

    it('throws for an unknown item id', () => {
      const task = buildTask();
      expect(() => task.toggleChecklistItem('does-not-exist', true)).toThrow(
        'Checklist item "does-not-exist" was not found on this task',
      );
    });
  });

  describe('the complete / submitForApproval / approve / reject state machine', () => {
    it('complete() finishes the task directly, fires a TaskCompletedEvent and records history', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1', historyId: 'h-1' });

      expect(task.status).toBe('completed');
      expect(task.completedById).toBe('agent-1');
      const events = task.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.completed');
      expect(task.history).toHaveLength(1);
      expect(task.history[0]).toMatchObject({ id: 'h-1', type: 'completed', byId: 'agent-1' });
    });

    it('refuses to complete an already-completed task', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1', historyId: 'h-1' });

      expect(() =>
        task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1', historyId: 'h-2' }),
      ).toThrow('This task is already completed');
    });

    it('submitForApproval() moves to awaiting_approval instead of completing, and records history', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent', historyId: 'h-1' });

      expect(task.status).toBe('awaiting_approval');
      expect(task.submittedForApprovalById).toBe('agent-1');
      expect(task.completedById).toBeNull(); // not finished yet — approve() still required
      expect(task.history).toHaveLength(1);
      expect(task.history[0]).toMatchObject({ id: 'h-1', type: 'submitted_for_approval', byId: 'agent-1' });
    });

    it('refuses to complete() a task that is awaiting approval — approve() is required instead', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent', historyId: 'h-1' });

      expect(() =>
        task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1', historyId: 'h-2' }),
      ).toThrow('This task is awaiting approval — use approve() instead');
    });

    it('approve() finishes a submitted task, fires TaskCompletedEvent and records history', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent', historyId: 'h-1' });
      task.approve({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1', historyId: 'h-2' });

      expect(task.status).toBe('completed');
      expect(task.completedById).toBe('mgr-1'); // the approver, not the original submitter
      expect(task.submittedForApprovalById).toBe('agent-1'); // work provenance preserved
      const events = task.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.completed');
      expect(task.history.map((h) => h.type)).toEqual(['submitted_for_approval', 'approved']);
    });

    it('refuses to approve() a task that was never submitted', () => {
      const task = buildTask({ requiresApproval: true });
      expect(() =>
        task.approve({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1', historyId: 'h-1' }),
      ).toThrow('This task is not awaiting approval');
    });

    it('reject() sends a submitted task back to pending with a reason recorded in history', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent', historyId: 'h-1' });
      task.reject({ byId: 'mgr-1', byName: 'Mona Manager', reason: 'Missing signature', historyId: 'h-2' });

      expect(task.status).toBe('pending');
      expect(task.submittedForApprovalById).toBeNull();
      expect(task.assignedToUserId).toBeNull(); // unrelated to assignment — the same assignee can fix and resubmit
      expect(task.history.map((h) => h.type)).toEqual(['submitted_for_approval', 'rejected']);
      expect(task.history[1]).toMatchObject({ byId: 'mgr-1', note: 'Missing signature' });
    });

    it('refuses to reject() a task that is not awaiting approval', () => {
      const task = buildTask({ requiresApproval: true });
      expect(() =>
        task.reject({ byId: 'mgr-1', byName: 'Mona Manager', reason: 'Nope', historyId: 'h-1' }),
      ).toThrow('This task is not awaiting approval');
    });

    it('refuses to reject() without a reason', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent', historyId: 'h-1' });
      expect(() =>
        task.reject({ byId: 'mgr-1', byName: 'Mona Manager', reason: '   ', historyId: 'h-2' }),
      ).toThrow('A reason is required to reject a task');
    });
  });

  it('rejects creation without a title', () => {
    expect(() => buildTask({ title: '   ' })).toThrow('Task title is required');
  });

  describe('addNote', () => {
    it('appends a note regardless of status', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1', historyId: 'h-1' });

      task.addNote({
        id: 'note-1',
        byId: 'agent-1',
        byName: 'Alex Agent',
        text: 'Called twice, no answer.',
      });

      expect(task.notes).toHaveLength(1);
      expect(task.notes[0]).toMatchObject({
        id: 'note-1',
        authorId: 'agent-1',
        authorName: 'Alex Agent',
        text: 'Called twice, no answer.',
      });
      expect(task.notes[0].createdAt).toBeInstanceOf(Date);
    });

    it('rejects an empty note', () => {
      const task = buildTask();
      expect(() =>
        task.addNote({ id: 'note-1', byId: 'agent-1', byName: 'Alex Agent', text: '   ' }),
      ).toThrow('Note text is required');
    });
  });
});
