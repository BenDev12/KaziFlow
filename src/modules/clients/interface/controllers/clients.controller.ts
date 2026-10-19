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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain-error';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentRepository,
} from '../../../departments/domain/repositories/department.repository.port';
import {
  ROUTE_REPOSITORY,
  RouteRepository,
} from '../../../routes/domain/repositories/route.repository.port';
import { Client } from '../../domain/entities/client.entity';
import { canAccessOffices } from '../../application/office-access';
import { CreateClientUseCase } from '../../application/use-cases/create-client.use-case';
import { DeleteClientUseCase } from '../../application/use-cases/delete-client.use-case';
import { GetClientUseCase } from '../../application/use-cases/get-client.use-case';
import {
  ClientListItem,
  ListClientsUseCase,
} from '../../application/use-cases/list-clients.use-case';
import { UpdateClientUseCase } from '../../application/use-cases/update-client.use-case';
import { RecordClientVisitUseCase } from '../../application/use-cases/record-client-visit.use-case';
import { SetClientRouteUseCase } from '../../application/use-cases/set-client-route.use-case';
import { CreateClientDto } from '../dto/create-client.dto';
import { ListClientsQueryDto } from '../dto/list-clients.query.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { RecordVisitDto } from '../dto/record-visit.dto';
import { AssignRouteDto } from '../dto/assign-route.dto';

function toResponse(client: Client, overdue?: boolean) {
  return {
    id: client.id,
    name: client.name,
    contact: client.contact,
    phone: client.phone,
    callCycle: client.callCycle,
    address: client.address,
    departmentId: client.departmentId,
    industry: client.industry,
    priority: client.priority,
    lastVisit: client.lastVisit,
    lastNotes: client.lastNotes,
    status: client.status,
    contacts: client.contacts,
    preferredVisitTime: client.preferredVisitTime,
    routeId: client.routeId,
    ...(overdue !== undefined ? { overdue } : {}),
  };
}

@ApiTags('clients')
@Controller('v1/clients')
@UseGuards(JwtAuthGuard, RequireOrgGuard)
export class ClientsController {
  constructor(
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
    private readonly deleteClientUseCase: DeleteClientUseCase,
    private readonly listClientsUseCase: ListClientsUseCase,
    private readonly getClientUseCase: GetClientUseCase,
    private readonly recordClientVisitUseCase: RecordClientVisitUseCase,
    private readonly setClientRouteUseCase: SetClientRouteUseCase,
    @Inject(DEPARTMENT_REPOSITORY) private readonly departments: DepartmentRepository,
    @Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository,
  ) {}

  /**
   * Offices is a sales/field-team feature — see office-access.ts for exactly
   * who qualifies. Everyone else gets a 403, not a filtered/empty view.
   */
  private async assertCanAccessOffices(user: JwtPayload): Promise<void> {
    const departments = await this.departments.findAll();
    if (!canAccessOffices(user.role, user.departmentId, departments)) {
      throw new ForbiddenError('You do not have access to Offices.');
    }
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    await this.assertCanAccessOffices(user);
    const client = await this.createClientUseCase.execute({
      ...dto,
      departmentId: user.departmentId,
    });
    return toResponse(client);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListClientsQueryDto) {
    await this.assertCanAccessOffices(user);
    const items: ClientListItem[] = await this.listClientsUseCase.execute(query);
    return items.map(({ client, overdue }) => toResponse(client, overdue));
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertCanAccessOffices(user);
    const client = await this.getClientUseCase.execute({ clientId: id });
    return toResponse(client);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    await this.assertCanAccessOffices(user);
    const client = await this.updateClientUseCase.execute({ clientId: id, patch: dto });
    return toResponse(client);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.assertCanAccessOffices(user);
    await this.deleteClientUseCase.execute({ clientId: id });
  }

  @Post(':id/visits')
  async recordVisit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RecordVisitDto,
  ) {
    await this.assertCanAccessOffices(user);
    const client = await this.recordClientVisitUseCase.execute({ clientId: id, notes: dto.notes });
    return toResponse(client);
  }

  /**
   * Adding/removing an office from a route. Agents may only touch their own
   * route (both the route they're adding to, and the one they're removing
   * from) — org_admin/manager can move any office onto any route.
   */
  @Patch(':id/assign-route')
  async assignRoute(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignRouteDto,
  ) {
    await this.assertCanAccessOffices(user);
    const canManage = user.role === 'org_admin' || user.role === 'manager';

    if (dto.routeId !== null) {
      const route = await this.routes.findById(dto.routeId);
      if (!route) throw new NotFoundError('Route', dto.routeId);
      if (!canManage && route.agentId !== user.sub) {
        throw new ForbiddenError('You can only add offices to your own route.');
      }
    } else if (!canManage) {
      const current = await this.getClientUseCase.execute({ clientId: id });
      if (current.routeId) {
        const route = await this.routes.findById(current.routeId);
        if (route && route.agentId !== user.sub) {
          throw new ForbiddenError('You can only remove offices from your own route.');
        }
      }
    }

    const client = await this.setClientRouteUseCase.execute({ clientId: id, routeId: dto.routeId });
    return toResponse(client);
  }
}
