/**
 * Ephemeral token for identifying the client to the server without linking
 * uploads to a persistent identity. Rotated hourly by the server.
 */
export interface EphemeralToken {
  value: string;
  expiresAt: string; // ISO 8601
}

/**
 * A geohash-6 bucket string (~1.2km × 0.6km cell).
 * This is the only location primitive the server ever receives.
 */
export type Geohash6 = string;

/**
 * Payload sent to POST /location.
 */
export interface LocationUpload {
  ephemeralToken: string;
  geohash6: Geohash6;
}

/**
 * Presence state as seen by the client.
 */
export type PresenceState =
  | { kind: 'idle' }
  | { kind: 'nearby'; detectedAt: string }
  | { kind: 'sleeping'; reason: 'no-background-permission' | 'no-friends' };

/**
 * Returned by POST /invites. The secret is shown once — user shares it
 * out-of-band with the intended recipient.
 */
export interface InviteResult {
  code: string;
  secret: string;
  expiresAt: string; // ISO 8601
}
