/**
 * SQL schema for proximity-presence.
 *
 * Applied at server startup via runMigrations().
 * Idempotent — safe to run on every boot.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS buckets (
  id             BIGSERIAL PRIMARY KEY,
  user_token     TEXT        NOT NULL,
  geohash6       TEXT        NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

-- Index for the match query: find all tokens in the same bucket that haven't expired.
CREATE INDEX IF NOT EXISTS buckets_geohash6_expires
  ON buckets (geohash6, expires_at);

CREATE TABLE IF NOT EXISTS friend_edges (
  id         BIGSERIAL PRIMARY KEY,
  token_a    TEXT NOT NULL,
  token_b    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token_a, token_b)
);

-- Index for looking up all friends of a token.
CREATE INDEX IF NOT EXISTS friend_edges_token_a ON friend_edges (token_a);
CREATE INDEX IF NOT EXISTS friend_edges_token_b ON friend_edges (token_b);

CREATE TABLE IF NOT EXISTS push_log (
  id         BIGSERIAL PRIMARY KEY,
  user_token TEXT        NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate-limit check: most recent push per token.
CREATE INDEX IF NOT EXISTS push_log_token_sent ON push_log (user_token, sent_at DESC);

CREATE TABLE IF NOT EXISTS device_tokens (
  id             BIGSERIAL PRIMARY KEY,
  user_token     TEXT NOT NULL,
  apns_token     TEXT NOT NULL,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_token)
);

-- One-time invite codes. hashed_secret is SHA-256 hex of the shared secret.
-- Single-use: accepted_at set on acceptance, subsequent attempts rejected.
CREATE TABLE IF NOT EXISTS invites (
  id             BIGSERIAL PRIMARY KEY,
  code           TEXT        NOT NULL UNIQUE,
  creator_token  TEXT        NOT NULL,
  hashed_secret  TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  accepted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invites_code ON invites (code);
`;
