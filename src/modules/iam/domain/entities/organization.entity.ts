import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/errors/domain-error';

export interface OrganizationProps {
  name: string;
  domain: string;
  industry: string;
  timezone: string;
  setupComplete: boolean;
}

/**
 * Organizations are the tenant boundary itself, not a tenant-scoped
 * resource — they deliberately have no `orgId` field and their repository
 * does not go through BaseMongoRepository's auto-scoping.
 */
export class Organization extends Entity<OrganizationProps> {
  private constructor(props: OrganizationProps, id: string) {
    super(props, id);
  }

  static create(
    props: { name: string; domain: string; industry: string; timezone: string },
    id: string,
  ): Organization {
    if (!props.name.trim()) throw new ValidationError('Organization name is required');
    if (!props.domain.trim()) throw new ValidationError('Organization domain is required');
    if (!props.timezone.trim()) throw new ValidationError('Organization timezone is required');

    return new Organization(
      {
        name: props.name.trim(),
        domain: props.domain.trim().toLowerCase(),
        industry: props.industry.trim(),
        timezone: props.timezone.trim(),
        setupComplete: true,
      },
      id,
    );
  }

  static reconstitute(props: OrganizationProps, id: string): Organization {
    return new Organization(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get domain(): string {
    return this.props.domain;
  }

  get industry(): string {
    return this.props.industry;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get setupComplete(): boolean {
    return this.props.setupComplete;
  }
}
