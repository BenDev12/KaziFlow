import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { gmail_v1, google } from 'googleapis';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { CreateTaskUseCase } from '../../../tasks/application/use-cases/create-task.use-case';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../iam/domain/repositories/user.repository.port';
import { User } from '../../../iam/domain/entities/user.entity';
import { GmailIntegration } from '../../domain/entities/gmail-integration.entity';
import {
  GMAIL_INTEGRATION_REPOSITORY,
  GmailIntegrationRepository,
} from '../../domain/repositories/gmail-integration.repository.port';
import { decryptToken } from '../../infrastructure/crypto/token-cipher';
import { ProcessedGmailMessageDocument } from '../../infrastructure/schemas/processed-gmail-message.schema';

/**
 * Polls every org's connected Gmail inbox (not a webhook/Pub-Sub push —
 * deliberately the simpler of the two real options) and turns matching
 * mail into tasks. Nothing here runs unless GMAIL_CLIENT_ID/SECRET are
 * set AND at least one org has connected + configured an inbox through
 * Settings → Automations → Integrations — this service never blocks boot.
 */
@Injectable()
export class GmailIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailIngestionService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly createTask: CreateTaskUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(GMAIL_INTEGRATION_REPOSITORY) private readonly integrations: GmailIntegrationRepository,
    @InjectModel(ProcessedGmailMessageDocument.name)
    private readonly processedModel: Model<ProcessedGmailMessageDocument>,
  ) {}

  onModuleInit(): void {
    const clientId = this.config.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.config.get<string>('GMAIL_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      this.logger.log(
        'Gmail ingestion not configured — skipping (set GMAIL_CLIENT_ID/SECRET to enable)',
      );
      return;
    }

    const pollMinutes = this.config.get<number>('GMAIL_POLL_INTERVAL_MINUTES') ?? 5;
    void this.pollAll();
    this.timer = setInterval(() => void this.pollAll(), pollMinutes * 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async pollAll(): Promise<void> {
    const ready = await this.integrations.findAllReadyToPoll();
    for (const integration of ready) {
      try {
        await this.pollOne(integration);
      } catch (err) {
        this.logger.error(
          `Gmail poll failed for org ${integration.orgId}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async pollOne(integration: GmailIntegration): Promise<void> {
    const clientId = this.config.get<string>('GMAIL_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('GMAIL_CLIENT_SECRET')!;
    const jwtAccessSecret = this.config.get<string>('JWT_ACCESS_SECRET')!;

    const agent = await this.users.findById(integration.connectedByUserId);
    if (!agent) {
      this.logger.warn(
        `Gmail integration for org ${integration.orgId} has no valid connecting user — skipping`,
      );
      return;
    }

    const refreshToken = decryptToken(integration.refreshTokenEncrypted, jwtAccessSecret);
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const list = await gmail.users.messages.list({
      userId: 'me',
      q: 'newer_than:2d',
      maxResults: 25,
    });
    const messageIds = (list.data.messages ?? [])
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));

    for (const messageId of messageIds) {
      try {
        await this.processMessage(gmail, integration, agent, messageId);
      } catch (err) {
        this.logger.error(
          `Gmail message ${messageId} (org ${integration.orgId}) failed: ${(err as Error).message}`,
        );
      }
    }
  }

  private async processMessage(
    gmail: gmail_v1.Gmail,
    integration: GmailIntegration,
    agent: User,
    messageId: string,
  ): Promise<void> {
    const dedupeId = `${integration.orgId}:${messageId}`;
    const alreadySeen = await this.processedModel.exists({ _id: dedupeId });
    if (alreadySeen) return;

    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = data.payload?.headers ?? [];
    const subject =
      headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '(no subject)';
    const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? '(unknown sender)';
    const body = extractPlainText(data.payload);
    const hasAttachment = hasAttachments(data.payload);

    const haystack = `${subject}\n${body}`.toLowerCase();
    const matched = integration.keywords.some((k) => haystack.includes(k.toLowerCase()));

    if (!matched) {
      await this.processedModel.create({
        _id: dedupeId,
        orgId: integration.orgId,
        matched: false,
        taskId: null,
      });
      return;
    }

    const description = [
      `From: ${from}`,
      '',
      body.slice(0, 2000) || '(no body text)',
      hasAttachment
        ? '\n— This email has an attachment. Open it in Gmail to view the original file.'
        : '',
    ].join('\n');

    const task = await TenantContext.run(
      {
        orgId: integration.orgId,
        userId: agent.id,
        role: agent.role,
        email: agent.email,
        departmentId: agent.departmentId,
      },
      () =>
        this.createTask.execute({
          title: subject.slice(0, 200),
          description,
          agentId: agent.id,
          agentName: agent.name,
          creatorDepartmentId: agent.departmentId,
          departmentId: integration.departmentId ?? undefined,
          requestingRole: agent.role,
          requestingDepartmentId: agent.departmentId,
          source: 'email',
        }),
    );

    await this.processedModel.create({
      _id: dedupeId,
      orgId: integration.orgId,
      matched: true,
      taskId: task.id,
    });
    this.logger.log(
      `Created task "${task.title}" (${task.id}) from Gmail message ${messageId} (org ${integration.orgId})`,
    );
  }
}

/** Walks a (possibly nested, multipart) Gmail message payload for the first text/plain part. */
function extractPlainText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const found = extractPlainText(part);
    if (found) return found;
  }
  // No text/plain part found anywhere — fall back to whatever the top-level body holds.
  return payload.body?.data ? decodeBase64Url(payload.body.data) : '';
}

function hasAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) return true;
  return (payload.parts ?? []).some(hasAttachments);
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}
