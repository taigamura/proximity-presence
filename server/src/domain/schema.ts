/**
 * SQL schema for proximity-presence.
 *
 * Applied at server startup via runMigrations().
 * Idempotent — safe to run on every boot.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS ephemeral_tokens (
  id          BIGSERIAL PRIMARY KEY,
  token       TEXT        NOT NULL UNIQUE,
  identity_id TEXT        NOT NULL,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ephemeral_tokens_token      ON ephemeral_tokens (token);
CREATE INDEX IF NOT EXISTS ephemeral_tokens_identity   ON ephemeral_tokens (identity_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS buckets (
  id             BIGSERIAL PRIMARY KEY,
  identity_id    TEXT        NOT NULL,
  geohash6       TEXT        NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

-- Index for the match query: find all identity_ids in the same bucket that haven't expired.
CREATE INDEX IF NOT EXISTS buckets_geohash6_expires
  ON buckets (geohash6, expires_at);

CREATE TABLE IF NOT EXISTS friend_edges (
  id           BIGSERIAL PRIMARY KEY,
  identity_a   TEXT NOT NULL,
  identity_b   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identity_a, identity_b)
);

-- Index for looking up all friends of an identity.
CREATE INDEX IF NOT EXISTS friend_edges_identity_a ON friend_edges (identity_a);
CREATE INDEX IF NOT EXISTS friend_edges_identity_b ON friend_edges (identity_b);

CREATE TABLE IF NOT EXISTS push_log (
  id          BIGSERIAL PRIMARY KEY,
  identity_id TEXT        NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate-limit check: most recent push per identity.
CREATE INDEX IF NOT EXISTS push_log_identity_sent ON push_log (identity_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS device_tokens (
  id             BIGSERIAL PRIMARY KEY,
  identity_id    TEXT NOT NULL,
  apns_token     TEXT NOT NULL,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identity_id)
);

-- One-time invite codes. hashed_secret is SHA-256 hex of the shared secret.
-- Single-use: accepted_at set on acceptance, subsequent attempts rejected.
CREATE TABLE IF NOT EXISTS invites (
  id             BIGSERIAL PRIMARY KEY,
  code           TEXT        NOT NULL UNIQUE,
  creator_identity TEXT      NOT NULL,
  hashed_secret  TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  accepted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invites_code ON invites (code);
`;
