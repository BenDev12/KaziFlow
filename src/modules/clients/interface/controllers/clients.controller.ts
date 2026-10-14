import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Client } from '../../domain/entities/client.entity';
import { CreateClientUseCase } from '../../application/use-cases/create-client.use-case';
import { DeleteClientUseCase } from '../../application/use-cases/delete-client.use-case';
import { GetClientUseCase } from '../../application/use-cases/get-client.use-case';
import {
  ClientListItem,
  ListClientsUseCase,
} from '../../application/use-cases/list-clients.use-case';
import { UpdateClientUseCase } from '../../application/use-cases/update-client.use-case';
import { CreateClientDto } from '../dto/create-client.dto';
import { ListClientsQueryDto } from '../dto/list-clients.query.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

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
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    const client = await this.createClientUseCase.execute({
      ...dto,
      departmentId: user.departmentId,
    });
    return toResponse(client);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListClientsQueryDto) {
    const items: ClientListItem[] = await this.listClientsUseCase.execute({
      ...query,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return items.map(({ client, overdue }) => toResponse(client, overdue));
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const client = await this.getClientUseCase.execute({
      clientId: id,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return toResponse(client);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const client = await this.updateClientUseCase.execute({
      clientId: id,
      patch: dto,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return toResponse(client);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.deleteClientUseCase.execute({
      clientId: id,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
  }
}
