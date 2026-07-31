import { createHash, randomBytes } from 'crypto';

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const INVITE_CODE_BYTES = 16;
export const SECRET_BYTES = 32;

export interface Invite {
  code: string;
  creatorToken: string;
  hashedSecret: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

export type CreateInviteResult = {
  code: string;
  /** Raw secret — returned to creator once, never stored. */
  secret: string;
  expiresAt: Date;
};

export type AcceptResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'bad_secret' | 'self_invite' };

/** Generate a new invite code + secret. Caller persists the invite row. */
export function createInvite(creatorToken: string, now: Date): CreateInviteResult & { hashedSecret: string } {
  const code = randomBytes(INVITE_CODE_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('hex');
  const hashedSecret = hashSecret(secret);
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  return { code, secret, hashedSecret, expiresAt };
}

/** Validate an accept attempt against the stored invite. Pure — no side effects. */
export function validateAccept(
  invite: Invite | null,
  acceptorToken: string,
  secret: string,
  now: Date,
): AcceptResult {
  if (!invite) return { ok: false, reason: 'not_found' };
  if (invite.acceptedAt !== null) return { ok: false, reason: 'already_used' };
  if (invite.expiresAt <= now) return { ok: false, reason: 'expired' };
  if (invite.creatorToken === acceptorToken) return { ok: false, reason: 'self_invite' };
  if (hashSecret(secret) !== invite.hashedSecret) return { ok: false, reason: 'bad_secret' };
  return { ok: true };
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
