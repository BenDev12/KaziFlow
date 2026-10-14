import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IamModule } from '../iam/iam.module';
import { DEPARTMENT_REPOSITORY } from './domain/repositories/department.repository.port';
import { CreateDepartmentUseCase } from './application/use-cases/create-department.use-case';
import { DeleteDepartmentUseCase } from './application/use-cases/delete-department.use-case';
import { ListDepartmentsUseCase } from './application/use-cases/list-departments.use-case';
import { DepartmentDocument, DepartmentSchema } from './infrastructure/schemas/department.schema';
import { DepartmentMongoRepository } from './infrastructure/repositories/department.mongo.repository';
import { DepartmentsController } from './interface/controllers/departments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DepartmentDocument.name, schema: DepartmentSchema }]),
    // See the matching forwardRef in IamModule — IamModule needs
    // DEPARTMENT_REPOSITORY (invites reference a department) and this
    // module needs USER_REPOSITORY (to block deleting an occupied
    // department), a genuine mutual reference.
    forwardRef(() => IamModule),
  ],
  controllers: [DepartmentsController],
  providers: [
    { provide: DEPARTMENT_REPOSITORY, useClass: DepartmentMongoRepository },
    CreateDepartmentUseCase,
    ListDepartmentsUseCase,
    DeleteDepartmentUseCase,
  ],
  exports: [DEPARTMENT_REPOSITORY],
})
export class DepartmentsModule {}
