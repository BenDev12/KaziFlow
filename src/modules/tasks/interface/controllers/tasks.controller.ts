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
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { Task } from '../../domain/entities/task.entity';
import { AddTaskNoteUseCase } from '../../application/use-cases/add-task-note.use-case';
import { ApproveTaskUseCase } from '../../application/use-cases/approve-task.use-case';
import { AssignTaskUseCase } from '../../application/use-cases/assign-task.use-case';
import { CompleteTaskUseCase } from '../../application/use-cases/complete-task.use-case';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { ListTasksUseCase } from '../../application/use-cases/list-tasks.use-case';
import { RejectTaskUseCase } from '../../application/use-cases/reject-task.use-case';
import { ToggleChecklistItemUseCase } from '../../application/use-cases/toggle-checklist-item.use-case';
import {
  NextStagePreview,
  TaskWorkflowPreviewService,
} from '../../application/services/task-workflow-preview.service';
import { AddTaskNoteDto } from '../dto/add-task-note.dto';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { ListTasksQueryDto } from '../dto/list-tasks.query.dto';
import { RejectTaskDto } from '../dto/reject-task.dto';
import { ToggleChecklistItemDto } from '../dto/toggle-checklist-item.dto';

function toResponse(task: Task, nextStages: NextStagePreview[] | null) {
  return {
    id: task.id,
    clientId: task.clientId,
    clientName: task.clientName,
    agentId: task.agentId,
    agentName: task.agentName,
    departmentId: task.departmentId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    source: task.source,
    activityLogId: task.activityLogId,
    status: task.status,
    templateId: task.templateId,
    stageId: task.stageId,
    requiresApproval: task.requiresApproval,
    checklistItems: task.checklistItems,
    assignedToUserId: task.assignedToUserId,
    assignedToName: task.assignedToName,
    links: task.links,
    notes: task.notes,
    history: task.history,
    parentTaskId: task.parentTaskId,
    submittedForApprovalById: task.submittedForApprovalById,
    submittedForApprovalByName: task.submittedForApprovalByName,
    submittedForApprovalAt: task.submittedForApprovalAt,
    completedById: task.completedById,
    completedByName: task.completedByName,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    // Where this hands off to once finished, if it's a pending/awaiting
    // workflow stage with a next stage — null otherwise (plain task, or
    // nothing further to spawn). See TaskWorkflowPreviewService.
    nextStages,
  };
}

/**
 * No controller-wide role gate on list/complete/checklist/assign/approve —
 * unlike Issues/Flags, Tasks are visible to every member of their current
 * department (agents included), and each action's REAL authorization (who's
 * the assignee, who manages this department) lives in its use-case, not a
 * blanket role check.
 */
@ApiTags('tasks')
@Controller('v1/tasks')
@UseGuards(JwtAuthGuard, RequireOrgGuard)
export class TasksController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly approveTaskUseCase: ApproveTaskUseCase,
    private readonly rejectTaskUseCase: RejectTaskUseCase,
    private readonly assignTaskUseCase: AssignTaskUseCase,
    private readonly toggleChecklistItemUseCase: ToggleChecklistItemUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly addTaskNoteUseCase: AddTaskNoteUseCase,
    private readonly workflowPreview: TaskWorkflowPreviewService,
  ) {}

  private async toResponseOne(task: Task) {
    const previews = await this.workflowPreview.nextStagesFor([task]);
    return toResponse(task, previews.get(task.id) ?? null);
  }

  private async toResponseMany(tasks: Task[]) {
    const previews = await this.workflowPreview.nextStagesFor(tasks);
    return tasks.map((t) => toResponse(t, previews.get(t.id) ?? null));
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    const task = await this.createTaskUseCase.execute({
      ...dto,
      agentId: user.sub,
      agentName: user.name,
      creatorDepartmentId: user.departmentId,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      links: dto.links?.map((l) => ({ label: l.label ?? '', url: l.url })),
    });
    return this.toResponseOne(task);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListTasksQueryDto) {
    const tasks = await this.listTasksUseCase.execute({
      ...query,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
      requestingUserId: user.sub,
    });
    return this.toResponseMany(tasks);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignTaskDto,
  ) {
    const task = await this.assignTaskUseCase.execute({
      taskId: id,
      assigneeUserId: dto.assigneeUserId,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/checklist/:itemId')
  async toggleChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ToggleChecklistItemDto,
  ) {
    const task = await this.toggleChecklistItemUseCase.execute({
      taskId: id,
      itemId,
      done: dto.done,
      requestingUserId: user.sub,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const task = await this.completeTaskUseCase.execute({
      taskId: id,
      byId: user.sub,
      byName: user.name,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddTaskNoteDto,
  ) {
    const task = await this.addTaskNoteUseCase.execute({
      taskId: id,
      text: dto.text,
      requestingUserId: user.sub,
      requestingUserName: user.name,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const task = await this.approveTaskUseCase.execute({
      taskId: id,
      byId: user.sub,
      byName: user.name,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectTaskDto,
  ) {
    const task = await this.rejectTaskUseCase.execute({
      taskId: id,
      byId: user.sub,
      byName: user.name,
      reason: dto.reason,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return this.toResponseOne(task);
  }
}
