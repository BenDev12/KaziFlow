export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface SendInviteEmailInput {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

export interface SendTaskNotificationEmailInput {
  to: string;
  recipientName: string;
  /** Short, scannable, e.g. "Needs your approval: Process order #42". */
  subject: string;
  /** One sentence saying what happened and why it's in their inbox. */
  headline: string;
  taskTitle: string;
  /** Optional extra context, e.g. a rejection reason. Plain text. */
  detail?: string;
  taskUrl: string;
}

export interface EmailService {
  sendInviteEmail(input: SendInviteEmailInput): Promise<void>;
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
  sendTaskNotificationEmail(input: SendTaskNotificationEmailInput): Promise<void>;
}
