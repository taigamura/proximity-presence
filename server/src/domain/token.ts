import { randomBytes } from 'crypto';

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const TOKEN_BYTES = 32;
export const IDENTITY_BYTES = 16;

export interface EphemeralTokenRecord {
  token: string;
  identityId: string;
  issuedAt: Date;
  expiresAt: Date;
}

/** Issue a new ephemeral token for a given identity. */
export function issueToken(identityId: string, now: Date): EphemeralTokenRecord {
  return {
    token: randomBytes(TOKEN_BYTES).toString('hex'),
    identityId,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  };
}

/** Generate a fresh stable identity ID (used on first registration). */
export function generateIdentityId(): string {
  return randomBytes(IDENTITY_BYTES).toString('hex');
}

/** True if a token record is still valid at `now`. */
export function isTokenValid(record: EphemeralTokenRecord, now: Date): boolean {
  return record.expiresAt > now;
}
