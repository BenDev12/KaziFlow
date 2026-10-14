import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { Roles } from '../../../../shared/interface/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { RolesGuard } from '../../../../shared/interface/guards/roles.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { Department } from '../../domain/entities/department.entity';
import { CreateDepartmentUseCase } from '../../application/use-cases/create-department.use-case';
import { DeleteDepartmentUseCase } from '../../application/use-cases/delete-department.use-case';
import { ListDepartmentsUseCase } from '../../application/use-cases/list-departments.use-case';
import { CreateDepartmentDto } from '../dto/create-department.dto';

function toResponse(department: Department) {
  return { id: department.id, name: department.name, createdAt: department.createdAt };
}

/**
 * Creating/deleting departments is an org_admin privilege (it reshapes who
 * sees what — see department-scope.ts); listing is open to every onboarded
 * member, since the invite form and a member's own profile need it too.
 */
@ApiTags('departments')
@Controller('v1/departments')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
export class DepartmentsController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly listDepartmentsUseCase: ListDepartmentsUseCase,
    private readonly deleteDepartmentUseCase: DeleteDepartmentUseCase,
  ) {}

  @Roles('org_admin')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDepartmentDto) {
    const department = await this.createDepartmentUseCase.execute({
      orgId: user.orgId,
      name: dto.name,
    });
    return toResponse(department);
  }

  @Get()
  async list() {
    const departments = await this.listDepartmentsUseCase.execute();
    return departments.map(toResponse);
  }

  @Roles('org_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteDepartmentUseCase.execute({ departmentId: id });
  }
}
