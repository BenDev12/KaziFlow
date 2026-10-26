import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { Roles } from '../../../../shared/interface/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { RequireOrgGuard } from '../../../../shared/interface/guards/require-org.guard';
import { RolesGuard } from '../../../../shared/interface/guards/roles.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import {
  CompleteGmailConnectionUseCase,
  GmailConnectionError,
} from '../../application/use-cases/complete-gmail-connection.use-case';
import { DisconnectGmailIntegrationUseCase } from '../../application/use-cases/disconnect-gmail-integration.use-case';
import { GetGmailIntegrationUseCase } from '../../application/use-cases/get-gmail-integration.use-case';
import { StartGmailConnectionUseCase } from '../../application/use-cases/start-gmail-connection.use-case';
import { UpdateGmailIntegrationSettingsUseCase } from '../../application/use-cases/update-gmail-integration-settings.use-case';
import { UpdateGmailIntegrationDto } from '../dto/update-gmail-integration.dto';

/**
 * One route here is public (`callback`) — Google redirects the browser to
 * it with no session cookie, only the signed `state` this controller
 * itself issued from `connect`. Every other route is the usual
 * org_admin-guarded management surface.
 */
@ApiTags('integrations')
@Controller('v1/integrations/gmail')
export class GmailIntegrationController {
  private readonly logger = new Logger(GmailIntegrationController.name);

  constructor(
    private readonly getIntegration: GetGmailIntegrationUseCase,
    private readonly startConnection: StartGmailConnectionUseCase,
    private readonly completeConnection: CompleteGmailConnectionUseCase,
    private readonly updateSettings: UpdateGmailIntegrationSettingsUseCase,
    private readonly disconnect: DisconnectGmailIntegrationUseCase,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin')
  @Get()
  async status(@CurrentUser() user: JwtPayload) {
    return this.getIntegration.execute({ orgId: user.orgId });
  }

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin')
  @Post('connect')
  async connect(@CurrentUser() user: JwtPayload) {
    return this.startConnection.execute({
      orgId: user.orgId,
      userId: user.sub,
      userName: user.name,
    });
  }

  /** Public — Google lands the browser here with no cookies, only our own signed `state`. */
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const frontendOrigin = this.config.get<string>('CORS_ORIGIN');
    const redirect = (search: string) => res.redirect(`${frontendOrigin}/automations?${search}`);

    if (error) {
      return redirect(
        `tab=integrations&gmail=error&reason=${encodeURIComponent('Connection was cancelled.')}`,
      );
    }
    if (!code || !state) {
      return redirect(
        `tab=integrations&gmail=error&reason=${encodeURIComponent('Missing connection details.')}`,
      );
    }

    try {
      await this.completeConnection.execute({ code, state });
      return redirect('tab=integrations&gmail=connected');
    } catch (err) {
      const reason = err instanceof GmailConnectionError ? err.message : 'Could not connect Gmail.';
      this.logger.error(`Gmail connect callback failed: ${(err as Error).message}`);
      return redirect(`tab=integrations&gmail=error&reason=${encodeURIComponent(reason)}`);
    }
  }

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin')
  @Patch()
  async update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateGmailIntegrationDto) {
    return this.updateSettings.execute({
      orgId: user.orgId,
      departmentId: dto.departmentId ?? null,
      keywords: dto.keywords ?? [],
    });
  }

  @UseGuards(JwtAuthGuard, RequireOrgGuard, RolesGuard)
  @Roles('org_admin')
  @Delete()
  async remove(@CurrentUser() user: JwtPayload) {
    await this.disconnect.execute({ orgId: user.orgId });
    return { connected: false };
  }
}
