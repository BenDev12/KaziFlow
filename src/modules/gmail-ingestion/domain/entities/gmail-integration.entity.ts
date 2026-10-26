/**
 * One connected Gmail inbox per org — created the moment an org_admin
 * finishes the OAuth consent screen, configured (department + keywords)
 * afterward from Settings. departmentId/keywords start empty so the
 * poller knows to skip a freshly-connected-but-not-yet-configured inbox.
 */
export interface GmailIntegrationProps {
  orgId: string;
  connectedEmail: string;
  departmentId: string | null;
  keywords: string[];
  connectedByUserId: string;
  connectedByUserName: string;
  refreshTokenEncrypted: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GmailIntegration {
  constructor(private readonly props: GmailIntegrationProps) {}

  get orgId(): string {
    return this.props.orgId;
  }

  get connectedEmail(): string {
    return this.props.connectedEmail;
  }

  get departmentId(): string | null {
    return this.props.departmentId;
  }

  get keywords(): string[] {
    return this.props.keywords;
  }

  get connectedByUserId(): string {
    return this.props.connectedByUserId;
  }

  get connectedByUserName(): string {
    return this.props.connectedByUserName;
  }

  get refreshTokenEncrypted(): string {
    return this.props.refreshTokenEncrypted;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Configured enough for the poller to actually act on it. */
  get isReadyToPoll(): boolean {
    return Boolean(this.props.departmentId) && this.props.keywords.length > 0;
  }

  toPublicView(): {
    connected: true;
    connectedEmail: string;
    departmentId: string | null;
    keywords: string[];
    connectedByUserName: string;
    createdAt: Date;
  } {
    return {
      connected: true,
      connectedEmail: this.props.connectedEmail,
      departmentId: this.props.departmentId,
      keywords: this.props.keywords,
      connectedByUserName: this.props.connectedByUserName,
      createdAt: this.props.createdAt,
    };
  }
}
