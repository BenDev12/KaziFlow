import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limits the public auth endpoints (login, signup, password reset,
 * invite accept) per TARGET ACCOUNT rather than per IP. Every browser
 * request reaches this API through the UI's Next.js proxy, so the client
 * IP is always the proxy's — an IP-keyed limit would lump every user into
 * one bucket. Keying on the email (or the reset/invite token in the URL)
 * still stops password guessing and reset-email spam against any one
 * account, whatever sits in front of the API. Falls back to IP for
 * requests that carry neither.
 *
 * Applied per route (with @Throttle limits) — deliberately not global.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const email: unknown = req.body?.email;
    if (typeof email === 'string' && email.trim()) return `email:${email.trim().toLowerCase()}`;
    const token = req.params?.token;
    if (typeof token === 'string' && token) return `token:${token}`;
    return `ip:${req.ip}`;
  }
}
