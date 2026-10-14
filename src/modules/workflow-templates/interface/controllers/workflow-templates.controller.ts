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
import { WorkflowTemplate } from '../../domain/entities/workflow-template.entity';
import { CreateWorkflowTemplateUseCase } from '../../application/use-cases/create-workflow-template.use-case';
import { DeleteWorkflowTemplateUseCase } from '../../application/use-cases/delete-workflow-template.use-case';
import { ListWorkflowTemplatesUseCase } from '../../application/use-cases/list-workflow-templates.use-case';
import { CreateWorkflowTemplateDto } from '../dto/create-workflow-template.dto';

function toResponse(template: WorkflowTemplate) {
  return {
    id: template.id,
    name: template.name,
    entryStageId: template.entryStageId,
    stages: template.stages,
    createdAt: template.createdAt,
  };
}

/** Creating/deleting SOPs is an org_admin privilege; listing is open to every onboarded member (the create-task picker needs it). */
@ApiTags('workflow-templates')
@Controller('v1/workflow-templates')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
export class WorkflowTemplatesController {
  constructor(
    private readonly createWorkflowTemplateUseCase: CreateWorkflowTemplateUseCase,
    private readonly listWorkflowTemplatesUseCase: ListWorkflowTemplatesUseCase,
    private readonly deleteWorkflowTemplateUseCase: DeleteWorkflowTemplateUseCase,
  ) {}

  @Roles('org_admin')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkflowTemplateDto) {
    const template = await this.createWorkflowTemplateUseCase.execute({
      orgId: user.orgId,
      name: dto.name,
      entryStageId: dto.entryStageId,
      stages: dto.stages,
    });
    return toResponse(template);
  }

  @Get()
  async list() {
    const templates = await this.listWorkflowTemplatesUseCase.execute();
    return templates.map(toResponse);
  }

  @Roles('org_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteWorkflowTemplateUseCase.execute({ templateId: id });
  }
}
