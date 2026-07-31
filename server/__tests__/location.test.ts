import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider, PushProvider } from '../src/platform/apns';
import { Pool } from 'pg';

function makeStubPool(overrides: Record<string, object[]> = {}): Pool {
  return {
    query: jest.fn().mockImplementation((sql: string) => {
      // Return specific rows for named queries when overrides provided.
      for (const [key, rows] of Object.entries(overrides)) {
        if (sql.includes(key)) return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
  } as unknown as Pool;
}

function makeStubPush(): PushProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    sendSilentPush: jest.fn(async (token: string) => { calls.push(token); }),
  };
}

beforeEach(() => {
  setPool(makeStubPool());
  setPushProvider(makeStubPush());
});

afterAll(() => {
  setPool(null);
  setPushProvider(null);
});

const app = createApp();

describe('POST /location', () => {
  it('returns 200 for a valid payload', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123', geohash6: 'xn774c' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when ephemeralToken is missing', async () => {
    const res = await request(app).post('/location').send({ geohash6: 'xn774c' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when geohash6 is missing', async () => {
    const res = await request(app).post('/location').send({ ephemeralToken: 'tok_abc123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app).post('/location').send({});
    expect(res.status).toBe(400);
  });

  it('dispatches a silent push when the match engine returns a token to notify', async () => {
    const push = makeStubPush();
    setPushProvider(push);

    // Stub pool: friend_edges returns one edge, device_tokens returns an APNs token.
    setPool(makeStubPool({
      friend_edges: [
        { token_a: 'tok_uploader', token_b: 'tok_friend1' },
        { token_a: 'tok_uploader', token_b: 'tok_friend2' },
        { token_a: 'tok_uploader', token_b: 'tok_friend3' },
      ],
      // Active bucket for friend1 in the same cell — triggers a match.
      buckets: [
        { user_token: 'tok_friend1', geohash6: 'xn774c', expires_at: new Date(Date.now() + 3_600_000) },
      ],
      device_tokens: [
        { user_token: 'tok_uploader', apns_token: 'apns_uploader' },
        { user_token: 'tok_friend1', apns_token: 'apns_friend1' },
      ],
    }));

    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_uploader', geohash6: 'xn774c' });

    expect(res.status).toBe(200);
    expect(res.body.notified).toBeGreaterThan(0);
    expect(push.sendSilentPush).toHaveBeenCalled();
  });
});

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
