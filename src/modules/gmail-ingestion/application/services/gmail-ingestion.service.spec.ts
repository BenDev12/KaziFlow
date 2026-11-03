import { ConfigService } from '@nestjs/config';
import type { gmail_v1 } from 'googleapis';
import { Model } from 'mongoose';
import { User } from '../../../iam/domain/entities/user.entity';
import { UserRepository } from '../../../iam/domain/repositories/user.repository.port';
import { CreateTaskUseCase } from '../../../tasks/application/use-cases/create-task.use-case';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskRepository } from '../../../tasks/domain/repositories/task.repository.port';
import { GmailIntegration } from '../../domain/entities/gmail-integration.entity';
import { GmailIntegrationRepository } from '../../domain/repositories/gmail-integration.repository.port';
import { GmailTokenCipher } from '../../infrastructure/crypto/token-cipher';
import { ProcessedGmailMessageDocument } from '../../infrastructure/schemas/processed-gmail-message.schema';
import { GmailIngestionService } from './gmail-ingestion.service';

const integration = new GmailIntegration({
  orgId: 'org-1',
  connectedEmail: 'inbox@example.com',
  departmentId: 'dept-1',
  keywords: ['order'],
  connectedByUserId: 'user-1',
  connectedByUserName: 'Ann',
  refreshTokenEncrypted: 'unused',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const agent = User.reconstitute(
  {
    email: 'ann@example.com',
    name: 'Ann',
    passwordHash: 'x',
    role: 'org_admin',
    orgId: 'org-1',
    departmentId: null,
    createdAt: new Date(),
  },
  'user-1',
);

const gmail = {
  users: {
    messages: {
      get: jest.fn().mockResolvedValue({
        data: {
          payload: {
            headers: [{ name: 'Subject', value: 'New order #42' }],
            mimeType: 'text/plain',
            body: { data: Buffer.from('Please process this order').toString('base64url') },
          },
        },
      }),
    },
  },
} as unknown as gmail_v1.Gmail;

describe('GmailIngestionService', () => {
  it('reuses the task from a poll that crashed before recording the email, instead of duplicating it', async () => {
    const createdTasks = new Map<string, Task>();
    const createTask = {
      execute: jest.fn(async (input: { taskId?: string }) => {
        const task = { id: input.taskId } as Task;
        createdTasks.set(task.id, task);
        return task;
      }),
    };
    const tasks = { findById: jest.fn(async (id: string) => createdTasks.get(id) ?? null) };
    const processedModel = {
      exists: jest.fn().mockResolvedValue(null),
      // First poll "crashes" right after creating the task.
      create: jest.fn().mockRejectedValueOnce(new Error('process died')).mockResolvedValue({}),
    };

    const service = new GmailIngestionService(
      new ConfigService({}),
      createTask as unknown as CreateTaskUseCase,
      {} as UserRepository,
      {} as GmailIntegrationRepository,
      processedModel as unknown as Model<ProcessedGmailMessageDocument>,
      {} as GmailTokenCipher,
      tasks as unknown as TaskRepository,
    );
    const processMessage = (id: string) =>
      (
        service as unknown as {
          processMessage: (...args: unknown[]) => Promise<void>;
        }
      ).processMessage(gmail, integration, agent, id);

    await expect(processMessage('msg-1')).rejects.toThrow('process died');
    await processMessage('msg-1'); // the next poll retries the same email

    expect(createTask.execute).toHaveBeenCalledTimes(1);
    expect(createdTasks.size).toBe(1);
    expect(processedModel.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ _id: 'org-1:msg-1', taskId: [...createdTasks.keys()][0] }),
    );

    // A different email gets its own, different task.
    await processMessage('msg-2');
    expect(createdTasks.size).toBe(2);
  });
});
