import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import ms from 'ms';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './cookie-names';

const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

function baseCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax',
    domain: config.get<string>('COOKIE_DOMAIN'),
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const base = baseCookieOptions(config);

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: ms(config.get<string>('JWT_ACCESS_TTL') ?? '15m'),
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: ms(config.get<string>('JWT_REFRESH_TTL') ?? '7d'),
    path: REFRESH_COOKIE_PATH,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = baseCookieOptions(config);
  res.clearCookie(ACCESS_TOKEN_COOKIE, base);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: REFRESH_COOKIE_PATH });
}
