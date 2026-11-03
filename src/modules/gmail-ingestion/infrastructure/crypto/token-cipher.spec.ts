import { ConfigService } from '@nestjs/config';
import { encryptToken, GmailTokenCipher } from './token-cipher';

const JWT_ACCESS_SECRET = 'jwt-access-secret-at-least-32-characters';
const TOKEN_ENCRYPTION_KEY = 'token-encryption-key-at-least-32-chars';

function cipherWith(env: Record<string, string>): GmailTokenCipher {
  return new GmailTokenCipher(new ConfigService(env));
}

describe('GmailTokenCipher', () => {
  const cipher = cipherWith({ JWT_ACCESS_SECRET, TOKEN_ENCRYPTION_KEY });

  it('round-trips a token under TOKEN_ENCRYPTION_KEY', () => {
    const encrypted = cipher.encrypt('refresh-token-1');

    expect(encrypted).not.toContain('refresh-token-1');
    expect(cipher.decrypt(encrypted)).toEqual({
      plainText: 'refresh-token-1',
      usedLegacyKey: false,
    });
  });

  it('still reads a token stored under JWT_ACCESS_SECRET, and flags it for re-encryption', () => {
    const legacy = encryptToken('refresh-token-legacy', JWT_ACCESS_SECRET);

    expect(cipher.decrypt(legacy)).toEqual({
      plainText: 'refresh-token-legacy',
      usedLegacyKey: true,
    });
  });

  it('keeps working after JWT_ACCESS_SECRET is rotated', () => {
    const encrypted = cipher.encrypt('refresh-token-2');
    const afterRotation = cipherWith({
      JWT_ACCESS_SECRET: 'a-brand-new-jwt-secret-at-least-32-chars',
      TOKEN_ENCRYPTION_KEY,
    });

    expect(afterRotation.decrypt(encrypted).plainText).toBe('refresh-token-2');
  });

  it('refuses a token encrypted with neither key', () => {
    const foreign = encryptToken('refresh-token-3', 'some-other-secret-at-least-32-chars!!');

    expect(() => cipher.decrypt(foreign)).toThrow();
  });
});
