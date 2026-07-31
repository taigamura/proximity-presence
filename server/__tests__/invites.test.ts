import request from 'supertest';
import { createApp } from '../src/app';
import { setPool } from '../src/db';
import { setPushProvider } from '../src/platform/apns';
import { hashSecret } from '../src/domain/invite';
import { Pool } from 'pg';

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
  it('returns 201 with code, secret, expiresAt for a valid creatorIdentity', async () => {
    const res = await request(app)
      .post('/invites')
      .send({ creatorIdentity: 'id_creator' });
    expect(res.status).toBe(201);
    expect(typeof res.body.code).toBe('string');
    expect(typeof res.body.secret).toBe('string');
    expect(typeof res.body.expiresAt).toBe('string');
  });

  it('returns 400 when creatorIdentity is missing', async () => {
    const res = await request(app).post('/invites').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /invites/:code/accept', () => {
  it('returns 200 when secret is correct and invite is fresh', async () => {
    const secret = 'valid_secret';
    const invite = {
      code: 'testcode',
      creator_identity: 'id_creator',
      hashed_secret: hashSecret(secret),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: null,
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/testcode/accept')
      .send({ acceptorIdentity: 'id_acceptor', secret });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 when invite code does not exist', async () => {
    const res = await request(app)
      .post('/invites/doesnotexist/accept')
      .send({ acceptorIdentity: 'id_acceptor', secret: 'anything' });
    expect(res.status).toBe(404);
  });

  it('returns 409 when invite is already used', async () => {
    const secret = 'valid_secret';
    const invite = {
      code: 'usedcode',
      creator_identity: 'id_creator',
      hashed_secret: hashSecret(secret),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: new Date(),
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/usedcode/accept')
      .send({ acceptorIdentity: 'id_acceptor', secret });
    expect(res.status).toBe(409);
  });

  it('returns 400 for a bad secret', async () => {
    const invite = {
      code: 'testcode',
      creator_identity: 'id_creator',
      hashed_secret: hashSecret('correct'),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      accepted_at: null,
    };
    setPool(makeStubPool({ invites: [invite] }));

    const res = await request(app)
      .post('/invites/testcode/accept')
      .send({ acceptorIdentity: 'id_acceptor', secret: 'wrong' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when acceptorIdentity is missing', async () => {
    const res = await request(app)
      .post('/invites/code/accept')
      .send({ secret: 'something' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /friends/:friendIdentity', () => {
  it('returns 200 for a valid remove request', async () => {
    const res = await request(app)
      .delete('/friends/id_friend')
      .set('x-identity-id', 'id_caller');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 when x-identity-id header is missing', async () => {
    const res = await request(app).delete('/friends/id_friend');
    expect(res.status).toBe(400);
  });

  it('returns 400 when caller tries to remove themselves', async () => {
    const res = await request(app)
      .delete('/friends/id_self')
      .set('x-identity-id', 'id_self');
    expect(res.status).toBe(400);
  });
});

describe('POST /tokens', () => {
  it('returns 201 with token, identityId, expiresAt for a new identity', async () => {
    const res = await request(app).post('/tokens').send({});
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.identityId).toBe('string');
    expect(typeof res.body.expiresAt).toBe('string');
  });

  it('returns 201 and reuses the provided identityId for rotation', async () => {
    const res = await request(app)
      .post('/tokens')
      .send({ identityId: 'id_existing' });
    expect(res.status).toBe(201);
    expect(res.body.identityId).toBe('id_existing');
  });

  it('issues a different token on each call', async () => {
    const r1 = await request(app).post('/tokens').send({ identityId: 'id_same' });
    const r2 = await request(app).post('/tokens').send({ identityId: 'id_same' });
    expect(r1.body.token).not.toBe(r2.body.token);
  });
});
