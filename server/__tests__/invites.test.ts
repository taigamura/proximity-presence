import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider } from '../src/platform/apns';
import { hashSecret } from '../src/domain/invite';
import { Pool } from 'pg';

// Minimal pool stub with per-table row overrides.
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

describe('POST /invites', () => {
  it('returns 201 with code, secret, expiresAt for a valid creatorToken', async () => {
    const res = await request(app)
      .post('/invites')
      .send({ creatorToken: 'tok_creator' });
    expect(res.status).toBe(201);
    expect(typeof res.body.code).toBe('string');
    expect(typeof res.body.secret).toBe('string');
    expect(typeof res.body.expiresAt).toBe('string');
  });

  it('returns 400 when creatorToken is missing', async () => {
    const res = await request(app).post('/invites').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /invites/:code/accept', () => {
  it('returns 200 when secret is correct and invite is fresh', async () => {
    const secret = 'valid_secret';
    const invite = {
      code: 'testcode',
      creator_token: 'tok_creator',
      hashed_secret: hashSecret(secret),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: null,
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/testcode/accept')
      .send({ acceptorToken: 'tok_acceptor', secret });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 when invite code does not exist', async () => {
    const res = await request(app)
      .post('/invites/doesnotexist/accept')
      .send({ acceptorToken: 'tok_acceptor', secret: 'anything' });
    expect(res.status).toBe(404);
  });

  it('returns 409 when invite is already used', async () => {
    const secret = 'valid_secret';
    const invite = {
      code: 'usedcode',
      creator_token: 'tok_creator',
      hashed_secret: hashSecret(secret),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: new Date(),
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/usedcode/accept')
      .send({ acceptorToken: 'tok_acceptor', secret });
    expect(res.status).toBe(409);
  });

  it('returns 400 for a bad secret', async () => {
    const invite = {
      code: 'testcode',
      creator_token: 'tok_creator',
      hashed_secret: hashSecret('correct'),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: null,
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/testcode/accept')
      .send({ acceptorToken: 'tok_acceptor', secret: 'wrong' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when acceptorToken is missing', async () => {
    const res = await request(app)
      .post('/invites/code/accept')
      .send({ secret: 'something' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /friends/:friendToken', () => {
  it('returns 200 for a valid remove request', async () => {
    const res = await request(app)
      .delete('/friends/tok_friend')
      .set('x-user-token', 'tok_caller');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when x-user-token header is missing', async () => {
    const res = await request(app).delete('/friends/tok_friend');
    expect(res.status).toBe(400);
  });

  it('returns 400 when caller tries to remove themselves', async () => {
    const res = await request(app)
      .delete('/friends/tok_self')
      .set('x-user-token', 'tok_self');
    expect(res.status).toBe(400);
  });
});
