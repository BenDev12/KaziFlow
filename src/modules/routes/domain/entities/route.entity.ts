import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

export type RoutePurpose = 'follow_up' | 'initial_visit' | 'general';

export interface RouteProps {
  name: string;
  purpose: RoutePurpose;
  agentId: string | null;
  agentName: string | null;
}

/** A named set of offices one field agent is responsible for visiting — see Client.routeId. */
export class Route extends Entity<RouteProps> {
  private constructor(props: RouteProps, id: string) {
    super(props, id);
  }

  static create(
    props: { name: string; purpose: RoutePurpose; agentId?: string | null; agentName?: string | null },
    id: string,
  ): Route {
    if (!props.name.trim()) throw new ValidationError('Route name is required');
    return new Route(
      {
        name: props.name.trim(),
        purpose: props.purpose,
        agentId: props.agentId ?? null,
        agentName: props.agentName ?? null,
      },
      id,
    );
  }

  static reconstitute(props: RouteProps, id: string): Route {
    return new Route(props, id);
  }

  rename(name: string): void {
    if (!name.trim()) throw new ValidationError('Route name is required');
    this.props.name = name.trim();
  }

  changePurpose(purpose: RoutePurpose): void {
    this.props.purpose = purpose;
  }

  assignTo(agentId: string, agentName: string): void {
    this.props.agentId = agentId;
    this.props.agentName = agentName;
  }

  unassign(): void {
    this.props.agentId = null;
    this.props.agentName = null;
  }

  get name(): string {
    return this.props.name;
  }

  get purpose(): RoutePurpose {
    return this.props.purpose;
  }

  get agentId(): string | null {
    return this.props.agentId;
  }

  get agentName(): string | null {
    return this.props.agentName;
  }
}
