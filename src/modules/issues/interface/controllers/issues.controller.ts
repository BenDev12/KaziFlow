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
import { ListIssuesUseCase } from '../../application/use-cases/list-issues.use-case';
import { RaiseIssueUseCase } from '../../application/use-cases/raise-issue.use-case';
import { ResolveIssueUseCase } from '../../application/use-cases/resolve-issue.use-case';
import { ListIssuesQueryDto } from '../dto/list-issues.query.dto';
import { RaiseIssueDto } from '../dto/raise-issue.dto';
import { ResolveIssueDto } from '../dto/resolve-issue.dto';
import { toIssueResponse } from '../presenters/issue.presenter';

@ApiTags('issues')
@Controller('v1/issues')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
export class IssuesController {
  constructor(
    private readonly raiseIssueUseCase: RaiseIssueUseCase,
    private readonly resolveIssueUseCase: ResolveIssueUseCase,
    private readonly listIssuesUseCase: ListIssuesUseCase,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async raise(@CurrentUser() user: JwtPayload, @Body() dto: RaiseIssueDto) {
    const issue = await this.raiseIssueUseCase.execute({
      ...dto,
      agentId: user.sub,
      agentName: user.name,
      departmentId: user.departmentId,
    });
    return toIssueResponse(issue);
  }

  // Open to every department member, not just managers/admins — same
  // visibility rule as Tasks (see TasksController). Resolving one stays
  // manager/admin-only, below.
  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListIssuesQueryDto) {
    const issues = await this.listIssuesUseCase.execute({
      ...query,
      requestingRole: user.role,
      requestingDepartmentId: user.departmentId,
    });
    return issues.map(toIssueResponse);
  }

  @Roles('org_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveIssueDto,
  ) {
    const issue = await this.resolveIssueUseCase.execute({
      issueId: id,
      note: dto.note,
      byId: user.sub,
      byName: user.name,
    });
    return toIssueResponse(issue);
  }
}
