import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider } from '../src/platform/apns';
import { MIN_FRIENDS_FOR_PUSH } from '../src/domain/match';
import { Pool } from 'pg';

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

describe('GET /friends/count', () => {
  it('returns 400 when x-identity-id header is missing', async () => {
    const res = await request(app).get('/friends/count');
    expect(res.status).toBe(400);
  });

  it('returns count=0 and meetsGate=false when the identity has no friends', async () => {
    setPool(makeStubPool({ friend_edges: [{ count: '0' }] }));
    const res = await request(app)
      .get('/friends/count')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.meetsGate).toBe(false);
  });

  it('returns meetsGate=false when below MIN_FRIENDS_FOR_PUSH', async () => {
    setPool(makeStubPool({ friend_edges: [{ count: String(MIN_FRIENDS_FOR_PUSH - 1) }] }));
    const res = await request(app)
      .get('/friends/count')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(MIN_FRIENDS_FOR_PUSH - 1);
    expect(res.body.meetsGate).toBe(false);
  });

  it('returns meetsGate=true when count equals MIN_FRIENDS_FOR_PUSH', async () => {
    setPool(makeStubPool({ friend_edges: [{ count: String(MIN_FRIENDS_FOR_PUSH) }] }));
    const res = await request(app)
      .get('/friends/count')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(MIN_FRIENDS_FOR_PUSH);
    expect(res.body.meetsGate).toBe(true);
  });

  it('returns meetsGate=true when count exceeds MIN_FRIENDS_FOR_PUSH', async () => {
    setPool(makeStubPool({ friend_edges: [{ count: String(MIN_FRIENDS_FOR_PUSH + 2) }] }));
    const res = await request(app)
      .get('/friends/count')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(200);
    expect(res.body.meetsGate).toBe(true);
  });
});

describe('DELETE /friends/:friendIdentity', () => {
  it('returns 400 when x-identity-id header is missing', async () => {
    const res = await request(app).delete('/friends/id_bob');
    expect(res.status).toBe(400);
  });

  it('returns 400 when caller tries to remove themselves', async () => {
    const res = await request(app)
      .delete('/friends/id_alice')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(400);
  });

  it('returns 200 on a valid remove', async () => {
    const res = await request(app)
      .delete('/friends/id_bob')
      .set('x-identity-id', 'id_alice');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
