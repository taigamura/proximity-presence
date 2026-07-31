import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider, PushProvider } from '../src/platform/apns';
import { Pool } from 'pg';

const FUTURE = new Date(Date.now() + 3_600_000);

// A valid token record row returned by the ephemeral_tokens lookup.
const VALID_TOKEN_ROW = {
  token: 'tok_abc123',
  identity_id: 'id_uploader',
  issued_at: new Date(),
  expires_at: FUTURE,
};

function makeStubPool(overrides: Record<string, object[]> = {}): Pool {
  const connectMock = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return {
    query: jest.fn().mockImplementation((sql: string) => {
      for (const [key, rows] of Object.entries(overrides)) {
        if (sql.includes(key)) return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
    connect: jest.fn().mockResolvedValue(connectMock),
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
  // Default: token lookup succeeds, everything else empty.
  setPool(makeStubPool({ ephemeral_tokens: [VALID_TOKEN_ROW] }));
  setPushProvider(makeStubPush());
});

afterAll(() => {
  setPool(null);
  setPushProvider(null);
});

const app = createApp();

describe('POST /location', () => {
  it('returns 200 for a valid payload with a known token', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123', geohash6: 'xn774c' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 when the token is not found', async () => {
    setPool(makeStubPool({ ephemeral_tokens: [] }));
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'unknown_token', geohash6: 'xn774c' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is expired', async () => {
    setPool(makeStubPool({
      ephemeral_tokens: [{
        ...VALID_TOKEN_ROW,
        expires_at: new Date(Date.now() - 1000),
      }],
    }));
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123', geohash6: 'xn774c' });
    expect(res.status).toBe(401);
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

  it('dispatches a silent push when the match engine returns identities to notify', async () => {
    const push = makeStubPush();
    setPushProvider(push);

    setPool(makeStubPool({
      ephemeral_tokens: [VALID_TOKEN_ROW],
      friend_edges: [
        { identity_a: 'id_uploader', identity_b: 'id_friend1' },
        { identity_a: 'id_uploader', identity_b: 'id_friend2' },
        { identity_a: 'id_uploader', identity_b: 'id_friend3' },
      ],
      buckets: [
        { identity_id: 'id_friend1', geohash6: 'xn774c', expires_at: FUTURE },
      ],
      device_tokens: [
        { identity_id: 'id_uploader', apns_token: 'apns_uploader' },
        { identity_id: 'id_friend1', apns_token: 'apns_friend1' },
      ],
    }));

    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123', geohash6: 'xn774c' });

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
