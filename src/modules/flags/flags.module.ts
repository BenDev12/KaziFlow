import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '../clients/clients.module';
import { FLAG_REPOSITORY } from './domain/repositories/flag.repository.port';
import { RaiseFlagUseCase } from './application/use-cases/raise-flag.use-case';
import { ResolveFlagUseCase } from './application/use-cases/resolve-flag.use-case';
import { ListFlagsUseCase } from './application/use-cases/list-flags.use-case';
import { FlagDocument, FlagSchema } from './infrastructure/schemas/flag.schema';
import { FlagMongoRepository } from './infrastructure/repositories/flag.mongo.repository';
import { FlagsController } from './interface/controllers/flags.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FlagDocument.name, schema: FlagSchema }]),
    ClientsModule,
  ],
  controllers: [FlagsController],
  providers: [
    { provide: FLAG_REPOSITORY, useClass: FlagMongoRepository },
    RaiseFlagUseCase,
    ResolveFlagUseCase,
    ListFlagsUseCase,
  ],
  exports: [FLAG_REPOSITORY],
})
export class FlagsModule {}
