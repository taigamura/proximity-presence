import { Pool } from 'pg';
import { BucketEntry, FriendEdge, PushLogEntry, PairPushLogEntry } from './match';
import { Invite } from './invite';
import { EphemeralTokenRecord } from './token';

// ---------------------------------------------------------------------------
// Ephemeral tokens
// ---------------------------------------------------------------------------

/** Persist a newly issued token. */
export async function insertToken(pool: Pool, record: EphemeralTokenRecord): Promise<void> {
  await pool.query(
    `INSERT INTO ephemeral_tokens (token, identity_id, issued_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [record.token, record.identityId, record.issuedAt, record.expiresAt],
  );
}

/** Look up a token record, or null if not found / expired. */
export async function getTokenRecord(
  pool: Pool,
  token: string,
): Promise<EphemeralTokenRecord | null> {
  const res = await pool.query<{
    token: string;
    identity_id: string;
    issued_at: Date;
    expires_at: Date;
  }>(
    `SELECT token, identity_id, issued_at, expires_at
     FROM ephemeral_tokens WHERE token = $1`,
    [token],
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    token: r.token,
    identityId: r.identity_id,
    issuedAt: new Date(r.issued_at),
    expiresAt: new Date(r.expires_at),
  };
}

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

/** Upsert the current bucket for an identity. */
export async function upsertBucket(
  pool: Pool,
  identityId: string,
  geohash6: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO buckets (identity_id, geohash6, expires_at)
     VALUES ($1, $2, $3)`,
    [identityId, geohash6, expiresAt],
  );
}

/** Fetch all non-expired buckets for a given geohash6 cell. */
export async function getActiveBucketsInCell(
  pool: Pool,
  geohash6: string,
  now: Date,
): Promise<BucketEntry[]> {
  const res = await pool.query<{ identity_id: string; geohash6: string; expires_at: Date }>(
    `SELECT identity_id, geohash6, expires_at
     FROM buckets
     WHERE geohash6 = $1 AND expires_at > $2`,
    [geohash6, now],
  );
  return res.rows.map((r) => ({
    identityId: r.identity_id,
    geohash6: r.geohash6,
    expiresAt: new Date(r.expires_at),
  }));
}

// ---------------------------------------------------------------------------
// Friend edges
// ---------------------------------------------------------------------------

/** Fetch all friend edges for a given identity (both directions). */
export async function getFriendEdges(pool: Pool, identityId: string): Promise<FriendEdge[]> {
  const res = await pool.query<{ identity_a: string; identity_b: string }>(
    `SELECT identity_a, identity_b FROM friend_edges
     WHERE identity_a = $1 OR identity_b = $1`,
    [identityId],
  );
  return res.rows.map((r) => ({ identityA: r.identity_a, identityB: r.identity_b }));
}

/** Return the number of confirmed friend edges for an identity. */
export async function getFriendCount(pool: Pool, identityId: string): Promise<number> {
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM friend_edges
     WHERE identity_a = $1 OR identity_b = $1`,
    [identityId],
  );
  return parseInt(res.rows[0].count, 10);
}

/** Return all friend identity IDs for a given identity. */
export async function getFriendIdentities(pool: Pool, identityId: string): Promise<string[]> {
  const res = await pool.query<{ identity_a: string; identity_b: string }>(
    `SELECT identity_a, identity_b FROM friend_edges
     WHERE identity_a = $1 OR identity_b = $1`,
    [identityId],
  );
  return res.rows.map((r) =>
    r.identity_a === identityId ? r.identity_b : r.identity_a,
  );
}

/** Remove a friend edge in both directions (block / remove). */
export async function removeFriendEdge(
  pool: Pool,
  identityA: string,
  identityB: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM friend_edges
     WHERE (identity_a = $1 AND identity_b = $2)
        OR (identity_a = $2 AND identity_b = $1)`,
    [identityA, identityB],
  );
}

// ---------------------------------------------------------------------------
// Push log
// ---------------------------------------------------------------------------

/** Fetch push log entries for a set of identities within the rate-limit window. */
export async function getRecentPushes(
  pool: Pool,
  identities: string[],
  since: Date,
): Promise<PushLogEntry[]> {
  if (identities.length === 0) return [];
  const placeholders = identities.map((_, i) => `$${i + 2}`).join(', ');
  const res = await pool.query<{ identity_id: string; sent_at: Date }>(
    `SELECT identity_id, sent_at FROM push_log
     WHERE sent_at > $1 AND identity_id IN (${placeholders})`,
    [since, ...identities],
  );
  return res.rows.map((r) => ({ identityId: r.identity_id, sentAt: new Date(r.sent_at) }));
}

/** Record that a push was sent to an identity. */
export async function recordPush(pool: Pool, identityId: string, sentAt: Date): Promise<void> {
  await pool.query(
    `INSERT INTO push_log (identity_id, sent_at) VALUES ($1, $2)`,
    [identityId, sentAt],
  );
}

// ---------------------------------------------------------------------------
// Pair push log — per-pair rate limit
// ---------------------------------------------------------------------------

/**
 * Fetch pair push log entries for all pairs involving the given identity
 * within the rate-limit window.
 * identity_a/identity_b are stored smallest-first in the DB.
 */
export async function getRecentPairPushes(
  pool: Pool,
  identityId: string,
  since: Date,
): Promise<PairPushLogEntry[]> {
  const res = await pool.query<{ identity_a: string; identity_b: string; sent_at: Date }>(
    `SELECT identity_a, identity_b, sent_at FROM pair_push_log
     WHERE sent_at > $1 AND (identity_a = $2 OR identity_b = $2)`,
    [since, identityId],
  );
  return res.rows.map((r) => ({
    identityA: r.identity_a,
    identityB: r.identity_b,
    sentAt: new Date(r.sent_at),
  }));
}

/** Record that a push was sent for a specific friend pair. */
export async function recordPairPush(
  pool: Pool,
  identityA: string,
  identityB: string,
  sentAt: Date,
): Promise<void> {
  // Normalise: store smaller ID first.
  const [a, b] = identityA < identityB ? [identityA, identityB] : [identityB, identityA];
  await pool.query(
    `INSERT INTO pair_push_log (identity_a, identity_b, sent_at) VALUES ($1, $2, $3)`,
    [a, b, sentAt],
  );
}

// ---------------------------------------------------------------------------
// Device tokens (APNs)
// ---------------------------------------------------------------------------

/** Look up APNs device tokens for a set of identity IDs. */
export async function getApnsTokens(
  pool: Pool,
  identities: string[],
): Promise<Map<string, string>> {
  if (identities.length === 0) return new Map();
  const placeholders = identities.map((_, i) => `$${i + 1}`).join(', ');
  const res = await pool.query<{ identity_id: string; apns_token: string }>(
    `SELECT identity_id, apns_token FROM device_tokens WHERE identity_id IN (${placeholders})`,
    identities,
  );
  return new Map(res.rows.map((r) => [r.identity_id, r.apns_token]));
}

/** Register or replace a device's APNs token. */
export async function upsertDeviceToken(
  pool: Pool,
  identityId: string,
  apnsToken: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO device_tokens (identity_id, apns_token)
     VALUES ($1, $2)
     ON CONFLICT (identity_id) DO UPDATE SET apns_token = EXCLUDED.apns_token, registered_at = NOW()`,
    [identityId, apnsToken],
  );
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

/** Persist a new invite row. */
export async function insertInvite(
  pool: Pool,
  code: string,
  creatorIdentity: string,
  hashedSecret: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO invites (code, creator_identity, hashed_secret, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, creatorIdentity, hashedSecret, expiresAt],
  );
}

/** Fetch an invite by code, or null if not found. */
export async function getInvite(pool: Pool, code: string): Promise<Invite | null> {
  const res = await pool.query<{
    code: string;
    creator_identity: string;
    hashed_secret: string;
    created_at: Date;
    expires_at: Date;
    accepted_at: Date | null;
  }>(
    `SELECT code, creator_identity, hashed_secret, created_at, expires_at, accepted_at
     FROM invites WHERE code = $1`,
    [code],
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    code: r.code,
    creatorToken: r.creator_identity,
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
  creatorIdentity: string,
  acceptorIdentity: string,
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
    const [a, b] = [creatorIdentity, acceptorIdentity].sort();
    await client.query(
      `INSERT INTO friend_edges (identity_a, identity_b) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
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

// ---------------------------------------------------------------------------
// Rotation purge — remove expired rows so the DB doesn't accumulate stale data
// ---------------------------------------------------------------------------

/** Delete all ephemeral tokens that have passed their expiry time. */
export async function purgeExpiredTokens(pool: Pool, now: Date): Promise<void> {
  await pool.query(`DELETE FROM ephemeral_tokens WHERE expires_at <= $1`, [now]);
}

/** Delete all bucket entries that have passed their expiry time. */
export async function purgeExpiredBuckets(pool: Pool, now: Date): Promise<void> {
  await pool.query(`DELETE FROM buckets WHERE expires_at <= $1`, [now]);
}

// ---------------------------------------------------------------------------
// Account deletion (GDPR / APPI)
// ---------------------------------------------------------------------------

/**
 * Atomically delete all data associated with an identity.
 * Covers every table that stores identity_id or identity edges.
 */
export async function deleteAccount(pool: Pool, identityId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM ephemeral_tokens WHERE identity_id = $1`, [identityId]);
    await client.query(`DELETE FROM buckets          WHERE identity_id = $1`, [identityId]);
    await client.query(`DELETE FROM push_log         WHERE identity_id = $1`, [identityId]);
    await client.query(`DELETE FROM device_tokens    WHERE identity_id = $1`, [identityId]);
    await client.query(
      `DELETE FROM friend_edges WHERE identity_a = $1 OR identity_b = $1`,
      [identityId],
    );
    await client.query(`DELETE FROM invites WHERE creator_identity = $1`, [identityId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
