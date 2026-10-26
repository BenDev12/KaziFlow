import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { GmailIntegration } from '../../domain/entities/gmail-integration.entity';
import {
  GMAIL_INTEGRATION_REPOSITORY,
  GmailIntegrationRepository,
} from '../../domain/repositories/gmail-integration.repository.port';
import { encryptToken } from '../../infrastructure/crypto/token-cipher';
import { buildGmailOAuthClient } from '../../infrastructure/google/gmail-oauth-client';
import { GmailConnectStatePayload } from './start-gmail-connection.use-case';

export class GmailConnectionError extends Error {}

@Injectable()
export class CompleteGmailConnectionUseCase {
  private readonly logger = new Logger(CompleteGmailConnectionUseCase.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @Inject(GMAIL_INTEGRATION_REPOSITORY)
    private readonly integrations: GmailIntegrationRepository,
  ) {}

  async execute({ code, state }: { code: string; state: string }): Promise<{ orgId: string }> {
    let claims: GmailConnectStatePayload;
    try {
      claims = this.jwt.verify<GmailConnectStatePayload>(state, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new GmailConnectionError(
        'This connection link has expired — try "Connect Gmail" again.',
      );
    }
    if (claims.purpose !== 'gmail-connect') {
      throw new GmailConnectionError('Invalid connection request.');
    }

    const oauth2Client = buildGmailOAuthClient(this.config);

    const { tokens } = await oauth2Client.getToken(code);
    const existing = await this.integrations.findByOrgId(claims.orgId);

    const refreshToken = tokens.refresh_token ?? undefined;
    if (!refreshToken && !existing) {
      throw new GmailConnectionError(
        'Google did not return a long-lived connection. If you connected this account before, remove ' +
          'Watimo\'s access at myaccount.google.com/permissions first, then try "Connect Gmail" again.',
      );
    }

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const connectedEmail = profile.data.emailAddress ?? '(unknown address)';

    const jwtAccessSecret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const refreshTokenEncrypted = refreshToken
      ? encryptToken(refreshToken, jwtAccessSecret)
      : existing!.refreshTokenEncrypted;

    const integration = new GmailIntegration({
      orgId: claims.orgId,
      connectedEmail,
      departmentId: existing?.departmentId ?? null,
      keywords: existing?.keywords ?? [],
      connectedByUserId: claims.userId,
      connectedByUserName: claims.userName,
      refreshTokenEncrypted,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    });

    await this.integrations.upsert(integration);
    this.logger.log(
      `Gmail connected for org ${claims.orgId} (${connectedEmail}) by ${claims.userName}`,
    );

    return { orgId: claims.orgId };
  }
}
