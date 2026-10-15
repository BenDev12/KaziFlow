import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsModule } from '../departments/departments.module';
import { CLIENT_REPOSITORY } from './domain/repositories/client.repository.port';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { DeleteClientUseCase } from './application/use-cases/delete-client.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { GetClientUseCase } from './application/use-cases/get-client.use-case';
import { RecordClientVisitUseCase } from './application/use-cases/record-client-visit.use-case';
import { ClientDocument, ClientSchema } from './infrastructure/schemas/client.schema';
import { ClientMongoRepository } from './infrastructure/repositories/client.mongo.repository';
import { ClientsController } from './interface/controllers/clients.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ClientDocument.name, schema: ClientSchema }]),
    DepartmentsModule,
  ],
  controllers: [ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: ClientMongoRepository },
    CreateClientUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    ListClientsUseCase,
    GetClientUseCase,
    RecordClientVisitUseCase,
  ],
  exports: [CLIENT_REPOSITORY],
})
export class ClientsModule {}
