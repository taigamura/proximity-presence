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

export interface MatchResult {
  /** Identity IDs that should receive a "someone nearby" push. */
  identitiesToNotify: string[];
}

/** Bucket TTL: how long an uploaded geohash stays live. */
export const BUCKET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Rate-limit window: minimum gap between pushes for the same identity. */
export const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

/** Minimum friend-count before any push fires (anonymity gate). */
export const MIN_FRIENDS_FOR_PUSH = 3;

/**
 * Given the uploading identity and its geohash, plus the current state of
 * buckets / edges / push_log, return which identities should be notified.
 *
 * Rules:
 * 1. Find all active (non-expired) buckets in the same geohash6 cell.
 * 2. Keep only identities that share a friend edge with the uploader.
 * 3. Gate: the uploader must have >= MIN_FRIENDS_FOR_PUSH total friends.
 * 4. Rate-limit: skip identities that received a push within RATE_LIMIT_MS.
 * 5. Both sides of each matching pair are notified.
 */
export function runMatch(
  uploaderIdentity: string,
  geohash6: string,
  now: Date,
  activeBuckets: BucketEntry[],
  friendEdges: FriendEdge[],
  recentPushes: PushLogEntry[],
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

  const recentlyPushed = new Set(
    recentPushes
      .filter((p) => now.getTime() - p.sentAt.getTime() < RATE_LIMIT_MS)
      .map((p) => p.identityId),
  );

  const toNotify = new Set<string>();

  for (const friendIdentity of nearbyFriends) {
    if (!recentlyPushed.has(uploaderIdentity)) toNotify.add(uploaderIdentity);
    if (!recentlyPushed.has(friendIdentity)) toNotify.add(friendIdentity);
  }

  return { identitiesToNotify: Array.from(toNotify) };
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
