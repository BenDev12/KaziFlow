import { Client } from './client.entity';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe('Client.isOverdue', () => {
  it('is overdue when never visited', () => {
    const client = Client.create(
      {
        name: 'Acme',
        contact: 'Jane',
        phone: '555-0100',
        callCycle: 'Weekly',
        address: '1 Main St',
      },
      'client-1',
    );
    expect(client.isOverdue()).toBe(true);
  });

  it('is not overdue when visited within the call cycle window', () => {
    const client = Client.create(
      {
        name: 'Acme',
        contact: 'Jane',
        phone: '555-0100',
        callCycle: 'Weekly',
        address: '1 Main St',
      },
      'client-1',
    );
    client.recordVisit(daysAgo(3), 'All good');
    expect(client.isOverdue()).toBe(false);
  });

  it('is overdue once the call cycle window has elapsed', () => {
    const client = Client.create(
      {
        name: 'Acme',
        contact: 'Jane',
        phone: '555-0100',
        callCycle: 'Weekly',
        address: '1 Main St',
      },
      'client-1',
    );
    client.recordVisit(daysAgo(10), 'All good');
    expect(client.isOverdue()).toBe(true);
  });

  it('uses the Monthly window for Monthly call cycles', () => {
    const client = Client.create(
      {
        name: 'Acme',
        contact: 'Jane',
        phone: '555-0100',
        callCycle: 'Monthly',
        address: '1 Main St',
      },
      'client-1',
    );
    client.recordVisit(daysAgo(20), 'All good');
    expect(client.isOverdue()).toBe(false);
  });

  it('rejects creation without a name', () => {
    expect(() =>
      Client.create(
        {
          name: '  ',
          contact: 'Jane',
          phone: '555-0100',
          callCycle: 'Weekly',
          address: '1 Main St',
        },
        'client-1',
      ),
    ).toThrow('Client name is required');
  });
});
