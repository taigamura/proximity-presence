import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider } from '../src/platform/apns';
import { purgeExpiredTokens, purgeExpiredBuckets } from '../src/domain/repository';
import { isValidLocationUpload } from '../src/domain/location';
import { Pool } from 'pg';

const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 1000);

function makeStubPool(overrides: Record<string, object[]> = {}): Pool {
  return {
    query: jest.fn().mockImplementation((sql: string) => {
      for (const [key, rows] of Object.entries(overrides)) {
        if (sql.includes(key)) return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  } as unknown as Pool;
}

const noopPush = { sendSilentPush: jest.fn().mockResolvedValue(undefined) };

beforeEach(() => {
  setPool(makeStubPool());
  setPushProvider(noopPush);
});

afterAll(() => {
  setPool(null);
  setPushProvider(null);
});

const app = createApp();

// ---------------------------------------------------------------------------
// purgeExpiredTokens
// ---------------------------------------------------------------------------

describe('purgeExpiredTokens', () => {
  it('issues a DELETE on ephemeral_tokens with the given timestamp', async () => {
    const pool = makeStubPool();
    await purgeExpiredTokens(pool, PAST);
    const calls = (pool.query as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    const [sql, params] = calls[0];
    expect(sql).toMatch(/DELETE FROM ephemeral_tokens/);
    expect(params[0]).toBe(PAST);
  });
});

// ---------------------------------------------------------------------------
// purgeExpiredBuckets
// ---------------------------------------------------------------------------

describe('purgeExpiredBuckets', () => {
  it('issues a DELETE on buckets with the given timestamp', async () => {
    const pool = makeStubPool();
    await purgeExpiredBuckets(pool, PAST);
    const calls = (pool.query as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    const [sql, params] = calls[0];
    expect(sql).toMatch(/DELETE FROM buckets/);
    expect(params[0]).toBe(PAST);
  });
});

// ---------------------------------------------------------------------------
// POST /tokens — purge fires after each token issue
// ---------------------------------------------------------------------------

describe('POST /tokens', () => {
  it('issues a new token for a known identityId', async () => {
    const res = await request(app)
      .post('/tokens')
      .send({ identityId: 'id_alice' });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.identityId).toBe('id_alice');
    expect(typeof res.body.expiresAt).toBe('string');
  });

  it('generates a fresh identityId when none is supplied', async () => {
    const res = await request(app).post('/tokens').send({});
    expect(res.status).toBe(201);
    expect(typeof res.body.identityId).toBe('string');
    expect(res.body.identityId.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Coordinate-free privacy invariant — isValidLocationUpload
// ---------------------------------------------------------------------------

describe('isValidLocationUpload — coordinate-free invariant', () => {
  it('accepts a valid { ephemeralToken, geohash6 } payload', () => {
    expect(isValidLocationUpload({ ephemeralToken: 'tok', geohash6: 'xn774c' })).toBe(true);
  });

  it('rejects a payload that contains raw latitude', () => {
    // A payload with lat/lng is NOT a valid upload — only geohash6 is accepted.
    expect(isValidLocationUpload({ ephemeralToken: 'tok', latitude: 35.68, longitude: 139.69 })).toBe(false);
  });

  it('rejects a payload that contains only coordinates without geohash6', () => {
    expect(isValidLocationUpload({ ephemeralToken: 'tok', lat: 35.68, lon: 139.69 })).toBe(false);
  });

  it('rejects a missing ephemeralToken', () => {
    expect(isValidLocationUpload({ geohash6: 'xn774c' })).toBe(false);
  });

  it('rejects a missing geohash6', () => {
    expect(isValidLocationUpload({ ephemeralToken: 'tok' })).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidLocationUpload(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Coordinate-free invariant at the HTTP layer
// ---------------------------------------------------------------------------

describe('POST /location — coordinate-free invariant', () => {
  it('returns 400 when latitude/longitude are sent instead of geohash6', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok', latitude: 35.68, longitude: 139.69 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when geohash6 is absent even if coordinates are present', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok', lat: 35.68, lng: 139.69 });
    expect(res.status).toBe(400);
  });
});
