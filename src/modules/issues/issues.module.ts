import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '../clients/clients.module';
import { ISSUE_REPOSITORY } from './domain/repositories/issue.repository.port';
import { RaiseIssueUseCase } from './application/use-cases/raise-issue.use-case';
import { ResolveIssueUseCase } from './application/use-cases/resolve-issue.use-case';
import { ListIssuesUseCase } from './application/use-cases/list-issues.use-case';
import { IssueDocument, IssueSchema } from './infrastructure/schemas/issue.schema';
import { IssueMongoRepository } from './infrastructure/repositories/issue.mongo.repository';
import { IssuesController } from './interface/controllers/issues.controller';
import { RealtimeIssueRepository } from './interface/realtime/realtime-issue.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: IssueDocument.name, schema: IssueSchema }]),
    ClientsModule,
  ],
  controllers: [IssuesController],
  providers: [
    IssueMongoRepository,
    { provide: ISSUE_REPOSITORY, useClass: RealtimeIssueRepository },
    RaiseIssueUseCase,
    ResolveIssueUseCase,
    ListIssuesUseCase,
  ],
  exports: [ISSUE_REPOSITORY],
})
export class IssuesModule {}
