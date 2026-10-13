import { Issue } from './issue.entity';

function raiseIssue(): Issue {
  return Issue.raise(
    {
      clientId: 'client-1',
      clientName: 'Acme',
      agentId: 'agent-1',
      agentName: 'Alex Agent',
      description: 'Billing dispute',
      visitNote: 'Client unhappy with invoice',
      activityLogId: 'activity-1',
    },
    'issue-1',
  );
}

describe('Issue.resolve', () => {
  it('transitions to resolved and records who resolved it', () => {
    const issue = raiseIssue();

    issue.resolve({
      note: 'Refund issued',
      byId: 'manager-1',
      byName: 'Mona Manager',
      orgId: 'org-1',
    });

    expect(issue.status).toBe('resolved');
    expect(issue.resolutionNote).toBe('Refund issued');
    expect(issue.resolvedById).toBe('manager-1');
    expect(issue.resolvedByName).toBe('Mona Manager');
    expect(issue.resolvedAt).toBeInstanceOf(Date);
  });

  it('emits an IssueResolvedEvent tagged with the resolving org', () => {
    const issue = raiseIssue();

    issue.resolve({
      note: 'Refund issued',
      byId: 'manager-1',
      byName: 'Mona Manager',
      orgId: 'org-1',
    });
    const events = issue.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('issue.resolved');
    expect(events[0].orgId).toBe('org-1');
  });

  it('clears events after they are pulled', () => {
    const issue = raiseIssue();
    issue.resolve({
      note: 'Refund issued',
      byId: 'manager-1',
      byName: 'Mona Manager',
      orgId: 'org-1',
    });

    issue.pullDomainEvents();

    expect(issue.pullDomainEvents()).toHaveLength(0);
  });

  it('refuses to resolve an already-resolved issue', () => {
    const issue = raiseIssue();
    issue.resolve({
      note: 'Refund issued',
      byId: 'manager-1',
      byName: 'Mona Manager',
      orgId: 'org-1',
    });

    expect(() =>
      issue.resolve({ note: 'Again', byId: 'manager-1', byName: 'Mona Manager', orgId: 'org-1' }),
    ).toThrow('This issue is already resolved');
  });

  it('rejects raising an issue without a description', () => {
    expect(() =>
      Issue.raise(
        {
          clientId: 'client-1',
          clientName: 'Acme',
          agentId: 'agent-1',
          agentName: 'Alex Agent',
          description: '   ',
          visitNote: 'note',
          activityLogId: 'activity-1',
        },
        'issue-1',
      ),
    ).toThrow('Issue description is required');
  });
});
