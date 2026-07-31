import {
  runMatch,
  getFriendsOf,
  makeBucketEntry,
  BucketEntry,
  FriendEdge,
  PushLogEntry,
  BUCKET_TTL_MS,
  RATE_LIMIT_MS,
  MIN_FRIENDS_FOR_PUSH,
} from '../src/domain/match';

const NOW = new Date('2026-01-01T12:00:00Z');
const CELL = 'xn774c';

function makeEdges(token: string, friends: string[]): FriendEdge[] {
  return friends.map((f) => ({ tokenA: token, tokenB: f }));
}

function activeBucket(userToken: string, geohash6 = CELL): BucketEntry {
  return { userToken, geohash6, expiresAt: new Date(NOW.getTime() + BUCKET_TTL_MS) };
}

function expiredBucket(userToken: string, geohash6 = CELL): BucketEntry {
  return { userToken, geohash6, expiresAt: new Date(NOW.getTime() - 1) };
}

// Build MIN_FRIENDS_FOR_PUSH friend edges for a token to clear the anonymity gate.
function enoughFriends(uploadToken: string, nearbyFriend: string): FriendEdge[] {
  const extras = Array.from({ length: MIN_FRIENDS_FOR_PUSH - 1 }, (_, i) => `extra_${i}`);
  return makeEdges(uploadToken, [nearbyFriend, ...extras]);
}

describe('getFriendsOf', () => {
  it('returns friends from both directions of an edge', () => {
    const edges: FriendEdge[] = [
      { tokenA: 'alice', tokenB: 'bob' },
      { tokenA: 'carol', tokenB: 'alice' },
    ];
    expect(getFriendsOf('alice', edges)).toEqual(new Set(['bob', 'carol']));
  });

  it('returns an empty set when no edges exist', () => {
    expect(getFriendsOf('alice', [])).toEqual(new Set());
  });
});

describe('makeBucketEntry', () => {
  it('sets expiresAt to now + BUCKET_TTL_MS', () => {
    const entry = makeBucketEntry('tok', CELL, NOW);
    expect(entry.expiresAt.getTime()).toBe(NOW.getTime() + BUCKET_TTL_MS);
  });
});

describe('runMatch', () => {
  it('notifies both sides when a friend is in the same cell', () => {
    const uploader = 'alice';
    const friend = 'bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];

    const { tokensToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toContain(uploader);
    expect(tokensToNotify).toContain(friend);
  });

  it('returns no notifications when no friends are in the cell', () => {
    const edges = enoughFriends('alice', 'bob');
    // bob is in a different cell
    const buckets = [activeBucket('bob', 'zzz999')];

    const { tokensToNotify } = runMatch('alice', CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toHaveLength(0);
  });

  it('returns no notifications when the nearby bucket has expired', () => {
    const edges = enoughFriends('alice', 'bob');
    const buckets = [expiredBucket('bob')];

    const { tokensToNotify } = runMatch('alice', CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toHaveLength(0);
  });

  it('gates notifications when uploader has fewer than MIN_FRIENDS_FOR_PUSH friends', () => {
    const edges: FriendEdge[] = [{ tokenA: 'alice', tokenB: 'bob' }]; // only 1 friend
    const buckets = [activeBucket('bob')];

    const { tokensToNotify } = runMatch('alice', CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toHaveLength(0);
  });

  it('skips a token that was pushed within the rate-limit window', () => {
    const uploader = 'alice';
    const friend = 'bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];
    // alice was pushed 30 min ago — still within 1-hour window
    const recentPushes: PushLogEntry[] = [
      { userToken: uploader, sentAt: new Date(NOW.getTime() - RATE_LIMIT_MS / 2) },
    ];

    const { tokensToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, recentPushes);
    expect(tokensToNotify).not.toContain(uploader);
    expect(tokensToNotify).toContain(friend);
  });

  it('allows a push after the rate-limit window has elapsed', () => {
    const uploader = 'alice';
    const friend = 'bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];
    // alice was pushed 61 min ago — outside the window
    const recentPushes: PushLogEntry[] = [
      { userToken: uploader, sentAt: new Date(NOW.getTime() - RATE_LIMIT_MS - 60_000) },
    ];

    const { tokensToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, recentPushes);
    expect(tokensToNotify).toContain(uploader);
  });

  it('does not notify a stranger in the same cell', () => {
    const edges = enoughFriends('alice', 'carol'); // bob is NOT in edges
    const buckets = [activeBucket('bob')];

    const { tokensToNotify } = runMatch('alice', CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toHaveLength(0);
  });

  it('does not include the uploader\'s own bucket in match candidates', () => {
    const uploader = 'alice';
    const edges = enoughFriends(uploader, 'bob');
    // only alice herself is in the cell
    const buckets = [activeBucket(uploader)];

    const { tokensToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, []);
    expect(tokensToNotify).toHaveLength(0);
  });
});
