/**
 * Pure match engine for proximity-presence.
 *
 * All functions operate on plain data — no DB or I/O.
 * Operates on stable identity IDs, not ephemeral tokens, so token
 * rotation doesn't affect the friend graph or match results.
 */

export interface BucketEntry {
  identityId: string;
  geohash6: string;
  expiresAt: Date;
}

export interface FriendEdge {
  identityA: string;
  identityB: string;
}

export interface PushLogEntry {
  identityId: string;
  sentAt: Date;
}

/** A push log entry keyed on the specific friend pair (order-normalised). */
export interface PairPushLogEntry {
  /** The lexicographically smaller identity ID. */
  identityA: string;
  /** The lexicographically larger identity ID. */
  identityB: string;
  sentAt: Date;
}

export interface MatchResult {
  /** Identity IDs that should receive a "someone nearby" push. */
  identitiesToNotify: string[];
}

/** Bucket TTL: how long an uploaded geohash stays live. */
export const BUCKET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Rate-limit window: minimum gap between pushes for the same friend pair. */
export const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Batching window: uploads within this window for the same pair are treated as
 * one event — the second upload won't re-fire a push already sent for that pair.
 */
export const BATCH_WINDOW_MS = 60 * 1000; // 60 seconds

/** Minimum friend-count before any push fires (anonymity gate). */
export const MIN_FRIENDS_FOR_PUSH = 3;

/**
 * Given the uploading identity and its geohash, plus the current state of
 * buckets / edges / pair_push_log, return which identities should be notified.
 *
 * Rules:
 * 1. Find all active (non-expired) buckets in the same geohash6 cell.
 * 2. Keep only identities that share a friend edge with the uploader.
 * 3. Gate: the uploader must have >= MIN_FRIENDS_FOR_PUSH total friends.
 * 4. Per-pair rate-limit: skip pairs that received a push within RATE_LIMIT_MS.
 *    Batching is implicit — a second upload within BATCH_WINDOW_MS hits the
 *    same rate-limit window and is suppressed automatically.
 * 5. Both sides of each qualifying pair are notified.
 */
export function runMatch(
  uploaderIdentity: string,
  geohash6: string,
  now: Date,
  activeBuckets: BucketEntry[],
  friendEdges: FriendEdge[],
  recentPairPushes: PairPushLogEntry[],
): MatchResult {
  const uploaderFriends = getFriendsOf(uploaderIdentity, friendEdges);

  if (uploaderFriends.size < MIN_FRIENDS_FOR_PUSH) {
    return { identitiesToNotify: [] };
  }

  const bucketsInCell = activeBuckets.filter(
    (b) => b.geohash6 === geohash6 && b.expiresAt > now && b.identityId !== uploaderIdentity,
  );

  const nearbyFriends = bucketsInCell
    .map((b) => b.identityId)
    .filter((id) => uploaderFriends.has(id));

  if (nearbyFriends.length === 0) {
    return { identitiesToNotify: [] };
  }

  // Build a set of pair keys that are still within the rate-limit window.
  const rateLimitedPairs = new Set(
    recentPairPushes
      .filter((p) => now.getTime() - p.sentAt.getTime() < RATE_LIMIT_MS)
      .map((p) => pairKey(p.identityA, p.identityB)),
  );

  const toNotify = new Set<string>();

  for (const friendIdentity of nearbyFriends) {
    if (!rateLimitedPairs.has(pairKey(uploaderIdentity, friendIdentity))) {
      toNotify.add(uploaderIdentity);
      toNotify.add(friendIdentity);
    }
  }

  return { identitiesToNotify: Array.from(toNotify) };
}

/** Normalise a pair of identity IDs into a stable string key (smaller first). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Normalise a pair into order-stable (identityA, identityB) for DB storage. */
export function normalisePair(a: string, b: string): { identityA: string; identityB: string } {
  return a < b ? { identityA: a, identityB: b } : { identityA: b, identityB: a };
}

/** Return the set of all friend identity IDs for a given identity. */
export function getFriendsOf(identityId: string, edges: FriendEdge[]): Set<string> {
  const friends = new Set<string>();
  for (const e of edges) {
    if (e.identityA === identityId) friends.add(e.identityB);
    else if (e.identityB === identityId) friends.add(e.identityA);
  }
  return friends;
}

/** Build a BucketEntry with the standard TTL from now. */
export function makeBucketEntry(identityId: string, geohash6: string, now: Date): BucketEntry {
  return {
    identityId,
    geohash6,
    expiresAt: new Date(now.getTime() + BUCKET_TTL_MS),
  };
}
