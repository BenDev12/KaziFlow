import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../../../../shared/infrastructure/tenancy/auth-cookies';
import { REFRESH_TOKEN_COOKIE } from '../../../../shared/infrastructure/tenancy/cookie-names';
import { CurrentUser } from '../../../../shared/interface/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/interface/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../shared/infrastructure/tenancy/jwt-payload.interface';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { SignupUseCase } from '../../application/use-cases/signup.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.signupUseCase.execute(dto);
    setAuthCookies(res, this.config, result.tokens);
    return { orgSetupComplete: result.orgSetupComplete };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.loginUseCase.execute(dto);
    setAuthCookies(res, this.config, result.tokens);
    return { orgSetupComplete: result.orgSetupComplete, user: result.user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token present');
    }
    const tokens = await this.refreshTokenUseCase.execute({ refreshToken });
    setAuthCookies(res, this.config, tokens);
    return { ok: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('profile')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.updateProfileUseCase.execute({ userId: user.sub, name: dto.name });
  }
}
