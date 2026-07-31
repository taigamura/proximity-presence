import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider } from '../src/platform/apns';
import { Pool } from 'pg';

const FUTURE = new Date(Date.now() + 3_600_000);

const VALID_TOKEN_ROW = {
  token: 'tok_abc',
  identity_id: 'id_user',
  issued_at: new Date(),
  expires_at: FUTURE,
};

function makeStubPool(overrides: Record<string, object[]> = {}): Pool {
  const txClient = {
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
    connect: jest.fn().mockResolvedValue(txClient),
  } as unknown as Pool;
}

const noopPush = { sendSilentPush: jest.fn().mockResolvedValue(undefined) };

beforeEach(() => {
  setPool(makeStubPool({ ephemeral_tokens: [VALID_TOKEN_ROW] }));
  setPushProvider(noopPush);
});

afterAll(() => {
  setPool(null);
  setPushProvider(null);
});

const app = createApp();

describe('DELETE /account', () => {
  it('returns 200 for a valid Bearer token', async () => {
    const res = await request(app)
      .delete('/account')
      .set('Authorization', 'Bearer tok_abc');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).delete('/account');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is not found', async () => {
    setPool(makeStubPool({ ephemeral_tokens: [] }));
    const res = await request(app)
      .delete('/account')
      .set('Authorization', 'Bearer unknown');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is expired', async () => {
    setPool(makeStubPool({
      ephemeral_tokens: [{ ...VALID_TOKEN_ROW, expires_at: new Date(Date.now() - 1000) }],
    }));
    const res = await request(app)
      .delete('/account')
      .set('Authorization', 'Bearer tok_abc');
    expect(res.status).toBe(401);
  });

  it('executes deletion inside a transaction (BEGIN/COMMIT called)', async () => {
    const txClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const pool = makeStubPool({ ephemeral_tokens: [VALID_TOKEN_ROW] });
    (pool.connect as jest.Mock).mockResolvedValue(txClient);
    setPool(pool);

    await request(app)
      .delete('/account')
      .set('Authorization', 'Bearer tok_abc');

    const calls: string[] = txClient.query.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls[0]).toBe('BEGIN');
    expect(calls[calls.length - 1]).toBe('COMMIT');
    // All six tables must be touched
    const combined = calls.join(' ');
    expect(combined).toMatch(/ephemeral_tokens/);
    expect(combined).toMatch(/buckets/);
    expect(combined).toMatch(/push_log/);
    expect(combined).toMatch(/device_tokens/);
    expect(combined).toMatch(/friend_edges/);
    expect(combined).toMatch(/invites/);
  });
});
