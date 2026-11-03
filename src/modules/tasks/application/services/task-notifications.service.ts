import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../../../../shared/infrastructure/tenancy/tenant-context';
import { EMAIL_SERVICE, EmailService } from '../../../iam/application/ports/email.port';
import { User } from '../../../iam/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../iam/domain/repositories/user.repository.port';
import { Task } from '../../domain/entities/task.entity';

interface Message {
  subject: string;
  headline: string;
  detail?: string;
}

/**
 * Emails people when a task needs something from them — so a pilot user
 * doesn't have to watch a dashboard to notice work landing on them:
 *
 * - assigned to you                      -> the assignee
 * - new in your department, unassigned   -> that department's managers
 * - waiting for approval                 -> the department's managers
 *                                           (org admins if it has none)
 * - sent back                            -> the assignee (or whoever submitted it)
 *
 * Never emails the person who did the action. Every method is safe to call
 * without awaiting: failures are logged, never thrown, so a slow or broken
 * mail provider can't fail or slow down the action that triggered it.
 */
@Injectable()
export class TaskNotificationsService {
  private readonly logger = new Logger(TaskNotificationsService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** A brand-new task — created by hand, from an email, or by a workflow hand-off. */
  taskCreated(task: Task): Promise<void> {
    if (task.assignedToUserId) return this.taskAssigned(task);
    return this.send(task, async (members) => {
      const managers = this.managersOf(members, task.departmentId);
      return {
        recipients: managers,
        message: {
          subject: `New in your department: ${task.title}`,
          headline: 'A new task has arrived in your department and nobody is assigned to it yet.',
        },
      };
    });
  }

  taskAssigned(task: Task): Promise<void> {
    return this.send(task, async (members) => ({
      recipients: members.filter((u) => u.id === task.assignedToUserId),
      message: {
        subject: `Assigned to you: ${task.title}`,
        headline: 'A task has been assigned to you.',
      },
    }));
  }

  submittedForApproval(task: Task): Promise<void> {
    return this.send(task, async (members) => {
      const managers = this.managersOf(members, task.departmentId);
      return {
        recipients: managers.length > 0 ? managers : members.filter((u) => u.role === 'org_admin'),
        message: {
          subject: `Needs your approval: ${task.title}`,
          headline: `${task.submittedForApprovalByName ?? 'Someone'} finished this task and it needs approval before it moves on.`,
        },
      };
    });
  }

  rejected(task: Task, reason: string): Promise<void> {
    // reject() clears the submitter fields, so fall back to the history entry.
    const submitterId =
      task.assignedToUserId ??
      [...task.history].reverse().find((h) => h.type === 'submitted_for_approval')?.byId;
    return this.send(task, async (members) => ({
      recipients: members.filter((u) => u.id === submitterId),
      message: {
        subject: `Sent back: ${task.title}`,
        headline: 'This task was sent back to you. The reason given:',
        detail: reason,
      },
    }));
  }

  private managersOf(members: User[], departmentId: string | null): User[] {
    if (!departmentId) return [];
    return members.filter((u) => u.role === 'manager' && u.departmentId === departmentId);
  }

  private async send(
    task: Task,
    pick: (members: User[]) => Promise<{ recipients: User[]; message: Message }>,
  ): Promise<void> {
    try {
      const tenant = TenantContext.get();
      const members = await this.users.findAllInOrg(tenant.orgId);
      const { recipients, message } = await pick(members);
      const taskUrl = `${this.config.get<string>('CORS_ORIGIN')}/tasks/${task.id}`;

      await Promise.all(
        recipients
          .filter((u) => u.id !== tenant.userId)
          .map((u) =>
            this.email
              .sendTaskNotificationEmail({
                to: u.email,
                recipientName: u.name,
                taskTitle: task.title,
                taskUrl,
                ...message,
              })
              .catch((error: unknown) =>
                this.logger.error(
                  `Couldn't email ${u.email} about task ${task.id}: ${(error as Error).message}`,
                ),
              ),
          ),
      );
    } catch (error) {
      this.logger.error(
        `Notifications for task ${task.id} failed`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
