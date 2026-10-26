import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Thrown at connect/callback time (not boot time) when the app-level
 * Google OAuth client isn't configured — Gmail ingestion is optional, so
 * the service itself stays silent at boot, but a user hitting "Connect
 * Gmail" deserves an explicit error instead of a silent no-op.
 */
export class GmailNotConfiguredError extends Error {
  constructor() {
    super(
      'Gmail integration is not configured on this server (GMAIL_CLIENT_ID/SECRET/OAUTH_REDIRECT_URI).',
    );
  }
}

export function buildGmailOAuthClient(config: ConfigService): OAuth2Client {
  const clientId = config.get<string>('GMAIL_CLIENT_ID');
  const clientSecret = config.get<string>('GMAIL_CLIENT_SECRET');
  const redirectUri = config.get<string>('GMAIL_OAUTH_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) {
    throw new GmailNotConfiguredError();
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
