import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailService,
  SendInviteEmailInput,
  SendPasswordResetEmailInput,
  SendTaskNotificationEmailInput,
} from '../../application/ports/email.port';

/**
 * Names and org names are typed by users — escape them
 * before they go into an email's HTML, or anyone could plant links or
 * markup in an email we send on their behalf.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'an Admin',
  manager: 'a Manager',
  agent: 'a Field Agent',
};

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    this.client = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
    const roleLabel = ROLE_LABELS[input.role] ?? input.role;

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject: `${input.inviterName} invited you to join ${input.orgName} on Solis Field Tracker`,
      html: `
        <p>Hi,</p>
        <p><strong>${escapeHtml(input.inviterName)}</strong> has invited you to join
        <strong>${escapeHtml(input.orgName)}</strong> on Solis Field Tracker as ${roleLabel}.</p>
        <p><a href="${escapeHtml(input.acceptUrl)}">Accept your invite and set a password</a></p>
        <p style="color:#64748b;font-size:13px">This link expires in 7 days. If you weren't
        expecting this invite, you can ignore this email.</p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send invite email: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject: 'Reset your Solis Field Tracker password',
      html: `
        <p>Hi ${escapeHtml(input.name)},</p>
        <p>We received a request to reset your password. Click the link below to choose a new one:</p>
        <p><a href="${escapeHtml(input.resetUrl)}">Reset your password</a></p>
        <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you didn't request
        this, you can ignore this email — your password won't change.</p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  async sendTaskNotificationEmail(input: SendTaskNotificationEmailInput): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
    const detail = input.detail
      ? `<blockquote style="white-space:pre-wrap;border-left:3px solid #cbd5e1;margin:12px 0;padding-left:12px;color:#334155">${escapeHtml(input.detail)}</blockquote>`
      : '';

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: `
        <p>Hi ${escapeHtml(input.recipientName)},</p>
        <p>${escapeHtml(input.headline)}</p>
        <p style="font-size:16px;font-weight:600;margin:16px 0 4px">${escapeHtml(input.taskTitle)}</p>
        ${detail}
        <p><a href="${escapeHtml(input.taskUrl)}">Open the task</a></p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send task notification email: ${error.message}`);
    }
  }
}
