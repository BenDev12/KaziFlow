import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GmailIntegration } from '../../domain/entities/gmail-integration.entity';
import {
  GMAIL_INTEGRATION_REPOSITORY,
  GmailIntegrationRepository,
} from '../../domain/repositories/gmail-integration.repository.port';

@Injectable()
export class UpdateGmailIntegrationSettingsUseCase {
  constructor(
    @Inject(GMAIL_INTEGRATION_REPOSITORY)
    private readonly integrations: GmailIntegrationRepository,
  ) {}

  async execute({
    orgId,
    departmentId,
    keywords,
  }: {
    orgId: string;
    departmentId: string | null;
    keywords: string[];
  }) {
    const existing = await this.integrations.findByOrgId(orgId);
    if (!existing) throw new NotFoundException('Gmail is not connected for this org.');

    const cleanedKeywords = keywords.map((k) => k.trim()).filter(Boolean);

    const updated = new GmailIntegration({
      orgId: existing.orgId,
      connectedEmail: existing.connectedEmail,
      departmentId,
      keywords: cleanedKeywords,
      connectedByUserId: existing.connectedByUserId,
      connectedByUserName: existing.connectedByUserName,
      refreshTokenEncrypted: existing.refreshTokenEncrypted,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    await this.integrations.upsert(updated);
    return updated.toPublicView();
  }
}
