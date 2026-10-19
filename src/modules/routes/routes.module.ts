import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsModule } from '../departments/departments.module';
import { ROUTE_REPOSITORY } from './domain/repositories/route.repository.port';
import { CreateRouteUseCase } from './application/use-cases/create-route.use-case';
import { ListRoutesUseCase } from './application/use-cases/list-routes.use-case';
import { ClaimRouteUseCase } from './application/use-cases/claim-route.use-case';
import { UpdateRouteUseCase } from './application/use-cases/update-route.use-case';
import { RouteDocument, RouteSchema } from './infrastructure/schemas/route.schema';
import { RouteMongoRepository } from './infrastructure/repositories/route.mongo.repository';
import { RoutesController } from './interface/controllers/routes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RouteDocument.name, schema: RouteSchema }]),
    DepartmentsModule,
  ],
  controllers: [RoutesController],
  providers: [
    { provide: ROUTE_REPOSITORY, useClass: RouteMongoRepository },
    CreateRouteUseCase,
    ListRoutesUseCase,
    ClaimRouteUseCase,
    UpdateRouteUseCase,
  ],
  exports: [ROUTE_REPOSITORY],
})
export class RoutesModule {}
