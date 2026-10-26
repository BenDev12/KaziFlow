import { Inject, Injectable } from '@nestjs/common';
import {
  GMAIL_INTEGRATION_REPOSITORY,
  GmailIntegrationRepository,
} from '../../domain/repositories/gmail-integration.repository.port';

@Injectable()
export class DisconnectGmailIntegrationUseCase {
  constructor(
    @Inject(GMAIL_INTEGRATION_REPOSITORY)
    private readonly integrations: GmailIntegrationRepository,
  ) {}

  async execute({ orgId }: { orgId: string }): Promise<void> {
    await this.integrations.deleteByOrgId(orgId);
  }
}
