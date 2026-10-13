import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { Roles } from '../../../../shared/interface/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { RolesGuard } from '../../../../shared/interface/guards/roles.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { Flag } from '../../domain/entities/flag.entity';
import { ListFlagsUseCase } from '../../application/use-cases/list-flags.use-case';
import { RaiseFlagUseCase } from '../../application/use-cases/raise-flag.use-case';
import { ResolveFlagUseCase } from '../../application/use-cases/resolve-flag.use-case';
import { ListFlagsQueryDto } from '../dto/list-flags.query.dto';
import { RaiseFlagDto } from '../dto/raise-flag.dto';
import { ResolveFlagDto } from '../dto/resolve-flag.dto';

function toResponse(flag: Flag) {
  return {
    id: flag.id,
    activityLogId: flag.activityLogId,
    clientId: flag.clientId,
    clientName: flag.clientName,
    agentId: flag.agentId,
    agentName: flag.agentName,
    flagType: flag.flagType,
    status: flag.status,
    visitNote: flag.visitNote,
    personSpokenTo: flag.personSpokenTo,
    resolutionNote: flag.resolutionNote,
    resolvedById: flag.resolvedById,
    resolvedByName: flag.resolvedByName,
    resolvedAt: flag.resolvedAt,
  };
}

@ApiTags('flags')
@Controller('v1/flags')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
export class FlagsController {
  constructor(
    private readonly raiseFlagUseCase: RaiseFlagUseCase,
    private readonly resolveFlagUseCase: ResolveFlagUseCase,
    private readonly listFlagsUseCase: ListFlagsUseCase,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async raise(@CurrentUser() user: JwtPayload, @Body() dto: RaiseFlagDto) {
    const flag = await this.raiseFlagUseCase.execute({
      ...dto,
      agentId: user.sub,
      agentName: user.name,
    });
    return toResponse(flag);
  }

  @Roles('org_admin', 'manager')
  @Get()
  async list(@Query() query: ListFlagsQueryDto) {
    const flags = await this.listFlagsUseCase.execute(query);
    return flags.map(toResponse);
  }

  @Roles('org_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveFlagDto,
  ) {
    const flag = await this.resolveFlagUseCase.execute({
      flagId: id,
      note: dto.note,
      byId: user.sub,
      byName: user.name,
    });
    return toResponse(flag);
  }
}
