import { GmailIntegration } from '../entities/gmail-integration.entity';

export const GMAIL_INTEGRATION_REPOSITORY = Symbol('GMAIL_INTEGRATION_REPOSITORY');

export interface GmailIntegrationRepository {
  findByOrgId(orgId: string): Promise<GmailIntegration | null>;
  /** Cross-tenant on purpose — the poller walks every org's integration in one pass. */
  findAllReadyToPoll(): Promise<GmailIntegration[]>;
  upsert(integration: GmailIntegration): Promise<void>;
  deleteByOrgId(orgId: string): Promise<void>;
}
