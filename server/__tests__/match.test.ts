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

function makeEdges(identity: string, friends: string[]): FriendEdge[] {
  return friends.map((f) => ({ identityA: identity, identityB: f }));
}

function activeBucket(identityId: string, geohash6 = CELL): BucketEntry {
  return { identityId, geohash6, expiresAt: new Date(NOW.getTime() + BUCKET_TTL_MS) };
}

function expiredBucket(identityId: string, geohash6 = CELL): BucketEntry {
  return { identityId, geohash6, expiresAt: new Date(NOW.getTime() - 1) };
}

function enoughFriends(uploaderIdentity: string, nearbyFriend: string): FriendEdge[] {
  const extras = Array.from({ length: MIN_FRIENDS_FOR_PUSH - 1 }, (_, i) => `extra_${i}`);
  return makeEdges(uploaderIdentity, [nearbyFriend, ...extras]);
}

describe('getFriendsOf', () => {
  it('returns friends from both directions of an edge', () => {
    const edges: FriendEdge[] = [
      { identityA: 'alice', identityB: 'bob' },
      { identityA: 'carol', identityB: 'alice' },
    ];
    expect(getFriendsOf('alice', edges)).toEqual(new Set(['bob', 'carol']));
  });

  it('returns an empty set when no edges exist', () => {
    expect(getFriendsOf('alice', [])).toEqual(new Set());
  });
});

describe('makeBucketEntry', () => {
  it('sets expiresAt to now + BUCKET_TTL_MS', () => {
    const entry = makeBucketEntry('id_alice', CELL, NOW);
    expect(entry.expiresAt.getTime()).toBe(NOW.getTime() + BUCKET_TTL_MS);
    expect(entry.identityId).toBe('id_alice');
  });
});

describe('runMatch', () => {
  it('notifies both sides when a friend is in the same cell', () => {
    const uploader = 'id_alice';
    const friend = 'id_bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];

    const { identitiesToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toContain(uploader);
    expect(identitiesToNotify).toContain(friend);
  });

  it('returns no notifications when no friends are in the cell', () => {
    const edges = enoughFriends('id_alice', 'id_bob');
    const buckets = [activeBucket('id_bob', 'zzz999')];

    const { identitiesToNotify } = runMatch('id_alice', CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toHaveLength(0);
  });

  it('returns no notifications when the nearby bucket has expired', () => {
    const edges = enoughFriends('id_alice', 'id_bob');
    const buckets = [expiredBucket('id_bob')];

    const { identitiesToNotify } = runMatch('id_alice', CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toHaveLength(0);
  });

  it('gates notifications when uploader has fewer than MIN_FRIENDS_FOR_PUSH friends', () => {
    const edges: FriendEdge[] = [{ identityA: 'id_alice', identityB: 'id_bob' }];
    const buckets = [activeBucket('id_bob')];

    const { identitiesToNotify } = runMatch('id_alice', CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toHaveLength(0);
  });

  it('skips an identity that was pushed within the rate-limit window', () => {
    const uploader = 'id_alice';
    const friend = 'id_bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];
    const recentPushes: PushLogEntry[] = [
      { identityId: uploader, sentAt: new Date(NOW.getTime() - RATE_LIMIT_MS / 2) },
    ];

    const { identitiesToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, recentPushes);
    expect(identitiesToNotify).not.toContain(uploader);
    expect(identitiesToNotify).toContain(friend);
  });

  it('allows a push after the rate-limit window has elapsed', () => {
    const uploader = 'id_alice';
    const friend = 'id_bob';
    const edges = enoughFriends(uploader, friend);
    const buckets = [activeBucket(friend)];
    const recentPushes: PushLogEntry[] = [
      { identityId: uploader, sentAt: new Date(NOW.getTime() - RATE_LIMIT_MS - 60_000) },
    ];

    const { identitiesToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, recentPushes);
    expect(identitiesToNotify).toContain(uploader);
  });

  it('does not notify a stranger in the same cell', () => {
    const edges = enoughFriends('id_alice', 'id_carol');
    const buckets = [activeBucket('id_bob')];

    const { identitiesToNotify } = runMatch('id_alice', CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toHaveLength(0);
  });

  it("does not include the uploader's own bucket in match candidates", () => {
    const uploader = 'id_alice';
    const edges = enoughFriends(uploader, 'id_bob');
    const buckets = [activeBucket(uploader)];

    const { identitiesToNotify } = runMatch(uploader, CELL, NOW, buckets, edges, []);
    expect(identitiesToNotify).toHaveLength(0);
  });
});
