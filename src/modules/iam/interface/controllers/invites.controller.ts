import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { setAuthCookies } from '../../../../shared/infrastructure/tenancy/auth-cookies';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { Roles } from '../../../../shared/interface/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { RolesGuard } from '../../../../shared/interface/guards/roles.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { Invite } from '../../domain/entities/invite.entity';
import { AcceptInviteUseCase } from '../../application/use-cases/accept-invite.use-case';
import { CreateInviteUseCase } from '../../application/use-cases/create-invite.use-case';
import { GetInviteByTokenUseCase } from '../../application/use-cases/get-invite-by-token.use-case';
import { ListInvitesUseCase } from '../../application/use-cases/list-invites.use-case';
import { RevokeInviteUseCase } from '../../application/use-cases/revoke-invite.use-case';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { CreateInviteDto } from '../dto/create-invite.dto';

function toResponse(invite: Invite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    departmentId: invite.departmentId,
    status: invite.status,
    invitedByName: invite.invitedByName,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

/**
 * Two shapes of route live in this controller: org-scoped management
 * (create/list/revoke, all guarded) and public token lookup/accept — the
 * invitee has no session until *after* accept(), so those two can't go
 * behind the usual controller-wide guard and are decorated per-method.
 */
@ApiTags('invites')
@Controller('v1/invites')
export class InvitesController {
  constructor(
    private readonly createInviteUseCase: CreateInviteUseCase,
    private readonly listInvitesUseCase: ListInvitesUseCase,
    private readonly revokeInviteUseCase: RevokeInviteUseCase,
    private readonly getInviteByTokenUseCase: GetInviteByTokenUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    const invite = await this.createInviteUseCase.execute({
      orgId: user.orgId,
      invitedByUserId: user.sub,
      invitedByName: user.name,
      invitedByRole: user.role,
      email: dto.email,
      role: dto.role,
      departmentId: dto.departmentId,
    });
    return toResponse(invite);
  }

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin', 'manager')
  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const invites = await this.listInvitesUseCase.execute({ orgId: user.orgId });
    return invites.map(toResponse);
  }

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const invite = await this.revokeInviteUseCase.execute({ inviteId: id, orgId: user.orgId });
    return toResponse(invite);
  }

  /** Public — looked up by an unguessable token, not a sequential id. */
  @Get(':token')
  async preview(@Param('token') token: string) {
    return this.getInviteByTokenUseCase.execute({ token });
  }

  @HttpCode(HttpStatus.OK)
  @Post(':token/accept')
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.acceptInviteUseCase.execute({
      token,
      name: dto.name,
      password: dto.password,
    });
    setAuthCookies(res, this.config, result.tokens);
    return { orgId: result.orgId, orgName: result.orgName, role: result.role };
  }
}
