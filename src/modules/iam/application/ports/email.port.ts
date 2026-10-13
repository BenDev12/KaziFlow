export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface SendInviteEmailInput {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

export interface EmailService {
  sendInviteEmail(input: SendInviteEmailInput): Promise<void>;
}
