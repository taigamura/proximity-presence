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
  setPool(makeStubPool({ ephemeral_tokens: [VALID_TOKEN_ROW] }));
  setPushProvider(noopPush);
});

afterAll(() => {
  setPool(null);
  setPushProvider(null);
});

const app = createApp();

describe('POST /device-token', () => {
  it('returns 200 for a valid ephemeralToken and apnsToken', async () => {
    const res = await request(app)
      .post('/device-token')
      .send({ ephemeralToken: 'tok_abc', apnsToken: 'apns_device_hex' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 when the token is not found', async () => {
    setPool(makeStubPool({ ephemeral_tokens: [] }));
    const res = await request(app)
      .post('/device-token')
      .send({ ephemeralToken: 'unknown', apnsToken: 'apns_device_hex' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is expired', async () => {
    setPool(makeStubPool({
      ephemeral_tokens: [{ ...VALID_TOKEN_ROW, expires_at: new Date(Date.now() - 1000) }],
    }));
    const res = await request(app)
      .post('/device-token')
      .send({ ephemeralToken: 'tok_abc', apnsToken: 'apns_device_hex' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when ephemeralToken is missing', async () => {
    const res = await request(app)
      .post('/device-token')
      .send({ apnsToken: 'apns_device_hex' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when apnsToken is missing', async () => {
    const res = await request(app)
      .post('/device-token')
      .send({ ephemeralToken: 'tok_abc' });
    expect(res.status).toBe(400);
  });
});
