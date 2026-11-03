import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** sha256, domain-separated, so the same secret can never double as another key. */
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(`gmail-token-key:${secret}`).digest();
}

/** Output shape: base64(iv).base64(authTag).base64(ciphertext) */
export function encryptToken(plainText: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    '.',
  );
}

export function decryptToken(encrypted: string, secret: string): string {
  const [ivB64, tagB64, ciphertextB64] = encrypted.split('.');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted Gmail refresh token');
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/**
 * Encrypts refresh tokens at rest with TOKEN_ENCRYPTION_KEY — its own
 * secret, so rotating JWT_ACCESS_SECRET (e.g. to force everyone to sign
 * in again) never silently breaks every connected inbox.
 *
 * Tokens stored before that key existed were encrypted with
 * JWT_ACCESS_SECRET; decrypt() still reads those and flags them so the
 * caller re-saves them under the new key — no reconnecting needed.
 */
@Injectable()
export class GmailTokenCipher {
  constructor(private readonly config: ConfigService) {}

  encrypt(plainText: string): string {
    return encryptToken(plainText, this.primaryKey());
  }

  decrypt(encrypted: string): { plainText: string; usedLegacyKey: boolean } {
    try {
      return { plainText: decryptToken(encrypted, this.primaryKey()), usedLegacyKey: false };
    } catch (primaryError) {
      try {
        const legacyKey = this.config.get<string>('JWT_ACCESS_SECRET')!;
        return { plainText: decryptToken(encrypted, legacyKey), usedLegacyKey: true };
      } catch {
        throw primaryError;
      }
    }
  }

  private primaryKey(): string {
    const key = this.config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
    return key;
  }
}
