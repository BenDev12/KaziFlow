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
      task.complete({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1' });

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

  describe('the complete / submitForApproval / approve state machine', () => {
    it('complete() finishes the task directly and fires a TaskCompletedEvent', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1' });

      expect(task.status).toBe('completed');
      expect(task.completedById).toBe('agent-1');
      const events = task.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.completed');
    });

    it('refuses to complete an already-completed task', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1' });

      expect(() =>
        task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1' }),
      ).toThrow('This task is already completed');
    });

    it('submitForApproval() moves to awaiting_approval instead of completing', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent' });

      expect(task.status).toBe('awaiting_approval');
      expect(task.submittedForApprovalById).toBe('agent-1');
      expect(task.completedById).toBeNull(); // not finished yet — approve() still required
    });

    it('refuses to complete() a task that is awaiting approval — approve() is required instead', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent' });

      expect(() =>
        task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1' }),
      ).toThrow('This task is awaiting approval — use approve() instead');
    });

    it('approve() finishes a submitted task and fires TaskCompletedEvent', () => {
      const task = buildTask({ requiresApproval: true });
      task.submitForApproval({ byId: 'agent-1', byName: 'Alex Agent' });
      task.approve({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1' });

      expect(task.status).toBe('completed');
      expect(task.completedById).toBe('mgr-1'); // the approver, not the original submitter
      expect(task.submittedForApprovalById).toBe('agent-1'); // work provenance preserved
      const events = task.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.completed');
    });

    it('refuses to approve() a task that was never submitted', () => {
      const task = buildTask({ requiresApproval: true });
      expect(() => task.approve({ byId: 'mgr-1', byName: 'Mona Manager', orgId: 'org-1' })).toThrow(
        'This task is not awaiting approval',
      );
    });
  });

  it('rejects creation without a title', () => {
    expect(() => buildTask({ title: '   ' })).toThrow('Task title is required');
  });

  describe('addNote', () => {
    it('appends a note regardless of status', () => {
      const task = buildTask();
      task.complete({ byId: 'agent-1', byName: 'Alex Agent', orgId: 'org-1' });

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
