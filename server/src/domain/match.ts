/**
 * Pure match engine for proximity-presence.
 *
 * All functions operate on plain data — no DB or I/O.
 * The DB layer calls these and acts on the results.
 */

export interface BucketEntry {
  userToken: string;
  geohash6: string;
  expiresAt: Date;
}

export interface FriendEdge {
  tokenA: string;
  tokenB: string;
}

export interface PushLogEntry {
  userToken: string;
  sentAt: Date;
}

export interface MatchResult {
  /** Tokens that should receive a "someone nearby" push. */
  tokensToNotify: string[];
}

/** Bucket TTL: how long an uploaded geohash stays live. */
export const BUCKET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Rate-limit window: minimum gap between pushes for the same token. */
export const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

/** Minimum friend-count before any push fires (anonymity gate). */
export const MIN_FRIENDS_FOR_PUSH = 3;

/**
 * Given the uploading token and its geohash, plus the current state of
 * buckets / edges / push_log, return which tokens should be notified.
 *
 * Rules:
 * 1. Find all active (non-expired) buckets in the same geohash6 cell.
 * 2. Keep only tokens that share a friend edge with the uploader.
 * 3. Gate: the uploader must have >= MIN_FRIENDS_FOR_PUSH total friends.
 * 4. Rate-limit: skip tokens that received a push within RATE_LIMIT_MS.
 * 5. Both sides of each matching pair are notified.
 */
export function runMatch(
  uploadToken: string,
  geohash6: string,
  now: Date,
  activeBuckets: BucketEntry[],
  friendEdges: FriendEdge[],
  recentPushes: PushLogEntry[],
): MatchResult {
  const uploaderFriends = getFriendsOf(uploadToken, friendEdges);

  if (uploaderFriends.size < MIN_FRIENDS_FOR_PUSH) {
    return { tokensToNotify: [] };
  }

  const bucketsInCell = activeBuckets.filter(
    (b) => b.geohash6 === geohash6 && b.expiresAt > now && b.userToken !== uploadToken,
  );

  const nearbyFriends = bucketsInCell
    .map((b) => b.userToken)
    .filter((t) => uploaderFriends.has(t));

  if (nearbyFriends.length === 0) {
    return { tokensToNotify: [] };
  }

  const recentlyPushed = new Set(
    recentPushes
      .filter((p) => now.getTime() - p.sentAt.getTime() < RATE_LIMIT_MS)
      .map((p) => p.userToken),
  );

  const toNotify = new Set<string>();

  for (const friendToken of nearbyFriends) {
    if (!recentlyPushed.has(uploadToken)) toNotify.add(uploadToken);
    if (!recentlyPushed.has(friendToken)) toNotify.add(friendToken);
  }

  return { tokensToNotify: Array.from(toNotify) };
}

/** Return the set of all friend tokens for a given token. */
export function getFriendsOf(token: string, edges: FriendEdge[]): Set<string> {
  const friends = new Set<string>();
  for (const e of edges) {
    if (e.tokenA === token) friends.add(e.tokenB);
    else if (e.tokenB === token) friends.add(e.tokenA);
  }
  return friends;
}

/** Build a BucketEntry with the standard TTL from now. */
export function makeBucketEntry(userToken: string, geohash6: string, now: Date): BucketEntry {
  return {
    userToken,
    geohash6,
    expiresAt: new Date(now.getTime() + BUCKET_TTL_MS),
  };
}
