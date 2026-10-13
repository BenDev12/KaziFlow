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
import { Task } from '../../domain/entities/task.entity';
import { CompleteTaskUseCase } from '../../application/use-cases/complete-task.use-case';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { ListTasksUseCase } from '../../application/use-cases/list-tasks.use-case';
import { CreateTaskDto } from '../dto/create-task.dto';
import { ListTasksQueryDto } from '../dto/list-tasks.query.dto';

function toResponse(task: Task) {
  return {
    id: task.id,
    clientId: task.clientId,
    clientName: task.clientName,
    agentId: task.agentId,
    agentName: task.agentName,
    description: task.description,
    dueDate: task.dueDate,
    activityLogId: task.activityLogId,
    status: task.status,
    completedById: task.completedById,
    completedByName: task.completedByName,
    completedAt: task.completedAt,
  };
}

@ApiTags('tasks')
@Controller('v1/tasks')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
export class TasksController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    const task = await this.createTaskUseCase.execute({
      ...dto,
      agentId: user.sub,
      agentName: user.name,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return toResponse(task);
  }

  @Roles('org_admin', 'manager')
  @Get()
  async list(@Query() query: ListTasksQueryDto) {
    const tasks = await this.listTasksUseCase.execute(query);
    return tasks.map(toResponse);
  }

  @Roles('org_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const task = await this.completeTaskUseCase.execute({
      taskId: id,
      byId: user.sub,
      byName: user.name,
    });
    return toResponse(task);
  }
}
