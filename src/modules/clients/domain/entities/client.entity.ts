import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

export type CallCycle = 'Weekly' | 'Bi-weekly' | 'Monthly';
export type ClientPriority = 'hot' | 'warm' | 'cold';
export type ClientStatus = 'active' | 'pending';
export type VisitTimeSlot = 'morning' | 'midday' | 'afternoon';

const CALL_CYCLE_DAYS: Record<CallCycle, number> = {
  Weekly: 7,
  'Bi-weekly': 14,
  Monthly: 30,
};

/**
 * A named contact at a client office — the activity-log form's "Person
 * spoken to" picker reads this list. `id` is caller-supplied (frontend
 * generates it client-side) rather than Mongo-assigned, since contacts are
 * embedded, not their own collection.
 */
export interface Contact {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
}

export interface ClientProps {
  name: string;
  contact: string;
  phone: string;
  callCycle: CallCycle;
  address: string;
  /** The creating agent's department at the time — see shared/application/department-scope.ts. */
  departmentId: string | null;
  industry: string | null;
  priority: ClientPriority | null;
  lastVisit: Date | null;
  lastNotes: string | null;
  status: ClientStatus;
  contacts: Contact[];
  preferredVisitTime: VisitTimeSlot | null;
  /** Which agent's route this office is on, if any — see Route entity. Set via assignRoute(), not applyPatch(). */
  routeId: string | null;
  /**
   * When the office was put on its CURRENT route — not when it was first
   * ever visited. A visit only counts toward "this round of the route is
   * done" if it happened on/after this timestamp, so re-adding an office
   * to a new route doesn't instantly count it as already handled.
   */
  routeAddedAt: Date | null;
}

export interface ClientPatch {
  name?: string;
  contact?: string;
  phone?: string;
  callCycle?: CallCycle;
  address?: string;
  industry?: string | null;
  priority?: ClientPriority | null;
  contacts?: { id: string; name: string; role?: string | null; phone?: string | null }[];
  preferredVisitTime?: VisitTimeSlot | null;
}

/** A "Stop" in ShughuliFlow's UI — a client office an agent visits on a recurring cycle. */
export class Client extends Entity<ClientProps> {
  private constructor(props: ClientProps, id: string) {
    super(props, id);
  }

  static create(
    props: {
      name: string;
      contact: string;
      phone: string;
      callCycle: CallCycle;
      address: string;
      departmentId: string | null;
      industry?: string | null;
      priority?: ClientPriority | null;
      // Accepts the DTO's looser shape (role/phone optional strings) as well
      // as a fully-formed Contact — normalized to `null` below either way,
      // so callers (the DTO, reconstitution, tests) don't all need to agree
      // on undefined vs null.
      contacts?: { id: string; name: string; role?: string | null; phone?: string | null }[];
      preferredVisitTime?: VisitTimeSlot | null;
    },
    id: string,
  ): Client {
    if (!props.name.trim()) throw new ValidationError('Client name is required');
    if (!props.phone.trim()) throw new ValidationError('Client phone is required');
    if (!props.address.trim()) throw new ValidationError('Client address is required');

    return new Client(
      {
        name: props.name.trim(),
        contact: props.contact.trim(),
        phone: props.phone.trim(),
        callCycle: props.callCycle,
        address: props.address.trim(),
        departmentId: props.departmentId,
        industry: props.industry?.trim() || null,
        priority: props.priority ?? null,
        lastVisit: null,
        lastNotes: null,
        status: 'pending',
        contacts: (props.contacts ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role ?? null,
          phone: c.phone ?? null,
        })),
        preferredVisitTime: props.preferredVisitTime ?? null,
        routeId: null,
        routeAddedAt: null,
      },
      id,
    );
  }

  static reconstitute(props: ClientProps, id: string): Client {
    return new Client(props, id);
  }

  applyPatch(patch: ClientPatch): void {
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new ValidationError('Client name is required');
      this.props.name = patch.name.trim();
    }
    if (patch.contact !== undefined) this.props.contact = patch.contact.trim();
    if (patch.phone !== undefined) {
      if (!patch.phone.trim()) throw new ValidationError('Client phone is required');
      this.props.phone = patch.phone.trim();
    }
    if (patch.callCycle !== undefined) this.props.callCycle = patch.callCycle;
    if (patch.address !== undefined) {
      if (!patch.address.trim()) throw new ValidationError('Client address is required');
      this.props.address = patch.address.trim();
    }
    if (patch.industry !== undefined) this.props.industry = patch.industry?.trim() || null;
    if (patch.priority !== undefined) this.props.priority = patch.priority;
    if (patch.contacts !== undefined) {
      this.props.contacts = patch.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role ?? null,
        phone: c.phone ?? null,
      }));
    }
    if (patch.preferredVisitTime !== undefined)
      this.props.preferredVisitTime = patch.preferredVisitTime;
  }

  recordVisit(visitDate: Date, notes: string): void {
    this.props.lastVisit = visitDate;
    this.props.lastNotes = notes;
    this.props.status = 'active';
  }

  assignRoute(routeId: string | null): void {
    this.props.routeId = routeId;
    this.props.routeAddedAt = routeId ? new Date() : null;
  }

  /** Computed server-side so every client of the UI (web, future mobile) agrees on "overdue". */
  isOverdue(asOf: Date = new Date()): boolean {
    if (!this.props.lastVisit) return true;
    const daysSinceVisit =
      (asOf.getTime() - this.props.lastVisit.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceVisit > CALL_CYCLE_DAYS[this.props.callCycle];
  }

  get name(): string {
    return this.props.name;
  }

  get contact(): string {
    return this.props.contact;
  }

  get phone(): string {
    return this.props.phone;
  }

  get callCycle(): CallCycle {
    return this.props.callCycle;
  }

  get address(): string {
    return this.props.address;
  }

  get departmentId(): string | null {
    return this.props.departmentId;
  }

  get industry(): string | null {
    return this.props.industry;
  }

  get priority(): ClientPriority | null {
    return this.props.priority;
  }

  get lastVisit(): Date | null {
    return this.props.lastVisit;
  }

  get lastNotes(): string | null {
    return this.props.lastNotes;
  }

  get status(): ClientStatus {
    return this.props.status;
  }

  get contacts(): Contact[] {
    return this.props.contacts;
  }

  get preferredVisitTime(): VisitTimeSlot | null {
    return this.props.preferredVisitTime;
  }

  get routeId(): string | null {
    return this.props.routeId;
  }

  get routeAddedAt(): Date | null {
    return this.props.routeAddedAt;
  }
}
