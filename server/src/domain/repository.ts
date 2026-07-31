import { Pool } from 'pg';
import { BucketEntry, FriendEdge, PushLogEntry } from './match';
import { Invite } from './invite';

/** Upsert the current bucket for a token (replace any previous entry). */
export async function upsertBucket(
  pool: Pool,
  userToken: string,
  geohash6: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO buckets (user_token, geohash6, expires_at)
     VALUES ($1, $2, $3)`,
    [userToken, geohash6, expiresAt],
  );
}

/** Fetch all non-expired buckets for a given geohash6 cell. */
export async function getActiveBucketsInCell(
  pool: Pool,
  geohash6: string,
  now: Date,
): Promise<BucketEntry[]> {
  const res = await pool.query<{ user_token: string; geohash6: string; expires_at: Date }>(
    `SELECT user_token, geohash6, expires_at
     FROM buckets
     WHERE geohash6 = $1 AND expires_at > $2`,
    [geohash6, now],
  );
  return res.rows.map((r) => ({
    userToken: r.user_token,
    geohash6: r.geohash6,
    expiresAt: new Date(r.expires_at),
  }));
}

/** Fetch all friend edges for a given token (both directions). */
export async function getFriendEdges(pool: Pool, userToken: string): Promise<FriendEdge[]> {
  const res = await pool.query<{ token_a: string; token_b: string }>(
    `SELECT token_a, token_b FROM friend_edges
     WHERE token_a = $1 OR token_b = $1`,
    [userToken],
  );
  return res.rows.map((r) => ({ tokenA: r.token_a, tokenB: r.token_b }));
}

/** Fetch push log entries for a set of tokens within the rate-limit window. */
export async function getRecentPushes(
  pool: Pool,
  tokens: string[],
  since: Date,
): Promise<PushLogEntry[]> {
  if (tokens.length === 0) return [];
  const placeholders = tokens.map((_, i) => `$${i + 2}`).join(', ');
  const res = await pool.query<{ user_token: string; sent_at: Date }>(
    `SELECT user_token, sent_at FROM push_log
     WHERE sent_at > $1 AND user_token IN (${placeholders})`,
    [since, ...tokens],
  );
  return res.rows.map((r) => ({ userToken: r.user_token, sentAt: new Date(r.sent_at) }));
}

/** Record that a push was sent to a token. */
export async function recordPush(pool: Pool, userToken: string, sentAt: Date): Promise<void> {
  await pool.query(
    `INSERT INTO push_log (user_token, sent_at) VALUES ($1, $2)`,
    [userToken, sentAt],
  );
}

/** Look up APNs device tokens for a set of user tokens. */
export async function getApnsTokens(
  pool: Pool,
  userTokens: string[],
): Promise<Map<string, string>> {
  if (userTokens.length === 0) return new Map();
  const placeholders = userTokens.map((_, i) => `$${i + 1}`).join(', ');
  const res = await pool.query<{ user_token: string; apns_token: string }>(
    `SELECT user_token, apns_token FROM device_tokens WHERE user_token IN (${placeholders})`,
    userTokens,
  );
  return new Map(res.rows.map((r) => [r.user_token, r.apns_token]));
}

/** Register or replace a device's APNs token. */
export async function upsertDeviceToken(
  pool: Pool,
  userToken: string,
  apnsToken: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO device_tokens (user_token, apns_token)
     VALUES ($1, $2)
     ON CONFLICT (user_token) DO UPDATE SET apns_token = EXCLUDED.apns_token, registered_at = NOW()`,
    [userToken, apnsToken],
  );
}

/** Persist a new invite row. */
export async function insertInvite(
  pool: Pool,
  code: string,
  creatorToken: string,
  hashedSecret: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO invites (code, creator_token, hashed_secret, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, creatorToken, hashedSecret, expiresAt],
  );
}

/** Fetch an invite by code, or null if not found. */
export async function getInvite(pool: Pool, code: string): Promise<Invite | null> {
  const res = await pool.query<{
    code: string;
    creator_token: string;
    hashed_secret: string;
    created_at: Date;
    expires_at: Date;
    accepted_at: Date | null;
  }>(
    `SELECT code, creator_token, hashed_secret, created_at, expires_at, accepted_at
     FROM invites WHERE code = $1`,
    [code],
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    code: r.code,
    creatorToken: r.creator_token,
    hashedSecret: r.hashed_secret,
    createdAt: new Date(r.created_at),
    expiresAt: new Date(r.expires_at),
    acceptedAt: r.accepted_at ? new Date(r.accepted_at) : null,
  };
}

/** Mark an invite as accepted and insert the friend edge atomically. */
export async function acceptInvite(
  pool: Pool,
  code: string,
  creatorToken: string,
  acceptorToken: string,
  now: Date,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE invites SET accepted_at = $1 WHERE code = $2`,
      [now, code],
    );
    // Normalise edge: store (smaller, larger) so the UNIQUE constraint fires correctly.
    const [a, b] = [creatorToken, acceptorToken].sort();
    await client.query(
      `INSERT INTO friend_edges (token_a, token_b) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [a, b],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Remove a friend edge in both directions (block / remove). */
export async function removeFriendEdge(
  pool: Pool,
  tokenA: string,
  tokenB: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM friend_edges
     WHERE (token_a = $1 AND token_b = $2)
        OR (token_a = $2 AND token_b = $1)`,
    [tokenA, tokenB],
  );
}
