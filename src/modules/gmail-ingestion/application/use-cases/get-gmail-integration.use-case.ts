import { Inject, Injectable } from '@nestjs/common';
import {
  GMAIL_INTEGRATION_REPOSITORY,
  GmailIntegrationRepository,
} from '../../domain/repositories/gmail-integration.repository.port';

@Injectable()
export class GetGmailIntegrationUseCase {
  constructor(
    @Inject(GMAIL_INTEGRATION_REPOSITORY)
    private readonly integrations: GmailIntegrationRepository,
  ) {}

  async execute({ orgId }: { orgId: string }) {
    const integration = await this.integrations.findByOrgId(orgId);
    if (!integration) return { connected: false as const };
    return integration.toPublicView();
  }
}
