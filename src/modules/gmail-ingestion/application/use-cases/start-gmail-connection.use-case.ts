import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { buildGmailOAuthClient, GMAIL_SCOPE } from '../../infrastructure/google/gmail-oauth-client';

export interface GmailConnectStatePayload {
  purpose: 'gmail-connect';
  orgId: string;
  userId: string;
  userName: string;
}

@Injectable()
export class StartGmailConnectionUseCase {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  execute({ orgId, userId, userName }: { orgId: string; userId: string; userName: string }): {
    url: string;
  } {
    const oauth2Client = buildGmailOAuthClient(this.config);

    const state = this.jwt.sign(
      { purpose: 'gmail-connect', orgId, userId, userName } satisfies GmailConnectStatePayload,
      { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '10m' },
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPE,
      state,
    });

    return { url };
  }
}
