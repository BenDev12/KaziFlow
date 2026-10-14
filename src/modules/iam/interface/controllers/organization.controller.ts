import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { setAuthCookies } from '../../../../shared/infrastructure/tenancy/auth-cookies';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { ListOrgMembersUseCase } from '../../application/use-cases/list-org-members.use-case';
import { CreateOrganizationDto } from '../dto/create-organization.dto';

@ApiTags('organization')
@Controller('v1/org')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrgMembersUseCase: ListOrgMembersUseCase,
    private readonly config: ConfigService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.createOrganizationUseCase.execute({
      requestingUserId: user.sub,
      ...dto,
    });
    // Re-issue tokens so the access token's orgId claim reflects the org just created.
    setAuthCookies(res, this.config, result.tokens);
    return { ok: true, orgId: result.orgId };
  }

  @UseGuards(RequireOrgGuard)
  @Get('members')
  async members(@CurrentUser() user: JwtPayload) {
    const members = await this.listOrgMembersUseCase.execute({ orgId: user.orgId });
    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      departmentId: m.departmentId,
    }));
  }
}
