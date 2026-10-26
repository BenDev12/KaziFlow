import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Encrypts refresh tokens at rest with a key derived from JWT_ACCESS_SECRET
 * (sha256, domain-separated) rather than asking the user to generate and
 * manage a second secret just for this one column.
 */
function deriveKey(jwtAccessSecret: string): Buffer {
  return createHash('sha256').update(`gmail-token-key:${jwtAccessSecret}`).digest();
}

/** Output shape: base64(iv).base64(authTag).base64(ciphertext) */
export function encryptToken(plainText: string, jwtAccessSecret: string): string {
  const key = deriveKey(jwtAccessSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    '.',
  );
}

export function decryptToken(encrypted: string, jwtAccessSecret: string): string {
  const [ivB64, tagB64, ciphertextB64] = encrypted.split('.');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted Gmail refresh token');
  }
  const key = deriveKey(jwtAccessSecret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
