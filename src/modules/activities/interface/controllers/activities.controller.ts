import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { Activity } from '../../domain/entities/activity.entity';
import { LogActivityUseCase } from '../../application/use-cases/log-activity.use-case';
import { ListActivitiesUseCase } from '../../application/use-cases/list-activities.use-case';
import { ListActivitiesQueryDto } from '../dto/list-activities.query.dto';
import { LogActivityDto } from '../dto/log-activity.dto';

function toResponse(activity: Activity) {
  return {
    id: activity.id,
    clientId: activity.clientId,
    clientName: activity.clientName,
    agentId: activity.agentId,
    agentName: activity.agentName,
    activityType: activity.activityType,
    personSpokenTo: activity.personSpokenTo,
    notes: activity.notes,
    raisedIssue: activity.raisedIssue,
    createdTask: activity.createdTask,
    loggedAt: activity.loggedAt,
  };
}

@ApiTags('activities')
@Controller('v1/activities')
@UseGuards(JwtAuthGuard, RequireOrgGuard)
export class ActivitiesController {
  constructor(
    private readonly logActivityUseCase: LogActivityUseCase,
    private readonly listActivitiesUseCase: ListActivitiesUseCase,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async log(@CurrentUser() user: JwtPayload, @Body() dto: LogActivityDto) {
    const activity = await this.logActivityUseCase.execute({
      ...dto,
      agentId: user.sub,
      agentName: user.name,
    });
    return toResponse(activity);
  }

  @Get()
  async list(@Query() query: ListActivitiesQueryDto) {
    const activities = await this.listActivitiesUseCase.execute({
      clientId: query.clientId,
      agentId: query.agentId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return activities.map(toResponse);
  }
}
