import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailService,
  SendInviteEmailInput,
  SendPasswordResetEmailInput,
} from '../../application/ports/email.port';

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
        <p><strong>${input.inviterName}</strong> has invited you to join
        <strong>${input.orgName}</strong> on Solis Field Tracker as ${roleLabel}.</p>
        <p><a href="${input.acceptUrl}">Accept your invite and set a password</a></p>
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
        <p>Hi ${input.name},</p>
        <p>We received a request to reset your password. Click the link below to choose a new one:</p>
        <p><a href="${input.resetUrl}">Reset your password</a></p>
        <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you didn't request
        this, you can ignore this email — your password won't change.</p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}
