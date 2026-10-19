import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { ForbiddenError } from '../../../../shared/domain/errors/domain-error';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../../departments/domain/repositories/department.repository.port';
import { Route } from '../../domain/entities/route.entity';
import { canAccessOffices } from '../../application/office-access';
import { CreateRouteUseCase } from '../../application/use-cases/create-route.use-case';
import { ListRoutesUseCase } from '../../application/use-cases/list-routes.use-case';
import { ClaimRouteUseCase } from '../../application/use-cases/claim-route.use-case';
import { UpdateRouteUseCase } from '../../application/use-cases/update-route.use-case';
import { DeleteRouteUseCase } from '../../application/use-cases/delete-route.use-case';
import { CreateRouteDto } from '../dto/create-route.dto';
import { UpdateRouteDto } from '../dto/update-route.dto';

function toResponse(route: Route) {
  return {
    id: route.id,
    name: route.name,
    purpose: route.purpose,
    agentId: route.agentId,
    agentName: route.agentName,
  };
}

@ApiTags('routes')
@Controller('v1/routes')
@UseGuards(JwtAuthGuard, RequireOrgGuard)
export class RoutesController {
  constructor(
    private readonly createRouteUseCase: CreateRouteUseCase,
    private readonly listRoutesUseCase: ListRoutesUseCase,
    private readonly claimRouteUseCase: ClaimRouteUseCase,
    private readonly updateRouteUseCase: UpdateRouteUseCase,
    private readonly deleteRouteUseCase: DeleteRouteUseCase,
    @Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository,
  ) {}

  /** Routes is an Offices feature — see office-access.ts for exactly who qualifies. */
  private async assertCanAccessOffices(user: JwtPayload): Promise<void> {
    const departments = await this.departments.findAll();
    if (!canAccessOffices(user.role, user.departmentId, departments)) {
      throw new ForbiddenError('You do not have access to Routes.');
    }
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRouteDto) {
    await this.assertCanAccessOffices(user);
    const route = await this.createRouteUseCase.execute({
      name: dto.name,
      purpose: dto.purpose,
      agentId: user.sub,
      agentName: user.name,
    });
    return toResponse(route);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    await this.assertCanAccessOffices(user);
    const routes = await this.listRoutesUseCase.execute({ role: user.role, userId: user.sub });
    return routes.map(toResponse);
  }

  @Post(':id/claim')
  async claim(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertCanAccessOffices(user);
    const route = await this.claimRouteUseCase.execute({
      routeId: id,
      agentId: user.sub,
      agentName: user.name,
    });
    return toResponse(route);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    await this.assertCanAccessOffices(user);
    const route = await this.updateRouteUseCase.execute({
      routeId: id,
      requesterId: user.sub,
      canManage: user.role === 'org_admin' || user.role === 'manager',
      name: dto.name,
      purpose: dto.purpose,
    });
    return toResponse(route);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertCanAccessOffices(user);
    await this.deleteRouteUseCase.execute({
      routeId: id,
      requesterId: user.sub,
      canManage: user.role === 'org_admin' || user.role === 'manager',
    });
  }
}
