import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../../shared/interface/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { RolesGuard } from '../../../../shared/interface/guards/roles.guard';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case';

@ApiTags('analytics')
@Controller('v1/analytics')
@UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
@Roles('org_admin', 'manager')
export class AnalyticsController {
  constructor(private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase) {}

  @Get('summary')
  async summary() {
    return this.getDashboardSummaryUseCase.execute();
  }
}
