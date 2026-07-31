import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('POST /location', () => {
  it('returns 200 for a valid payload', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123', geohash6: 'xn774c' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 400 when ephemeralToken is missing', async () => {
    const res = await request(app)
      .post('/location')
      .send({ geohash6: 'xn774c' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when geohash6 is missing', async () => {
    const res = await request(app)
      .post('/location')
      .send({ ephemeralToken: 'tok_abc123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app).post('/location').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
