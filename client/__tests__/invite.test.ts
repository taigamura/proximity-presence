import { generateInvite, acceptInvite } from '../src/platform/api';

const BASE = 'http://localhost:3000';

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  global.fetch = jest.fn().mockImplementation(
    (url: string, init?: RequestInit) => Promise.resolve(handler(url, init)),
  );
}

afterEach(() => jest.resetAllMocks());

describe('generateInvite', () => {
  it('POSTs creatorIdentity and returns code/secret/expiresAt', async () => {
    const payload = { code: 'abc123', secret: 'supersecret', expiresAt: '2026-08-07T00:00:00Z' };
    mockFetch(() =>
      new Response(JSON.stringify(payload), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    );

    const result = await generateInvite('id_alice');

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/invites`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ creatorIdentity: 'id_alice' }),
      }),
    );
    expect(result).toEqual(payload);
  });

  it('throws when the server returns an error', async () => {
    mockFetch(() => new Response('', { status: 400 }));
    await expect(generateInvite('id_alice')).rejects.toThrow('POST /invites failed: 400');
  });
});

describe('acceptInvite', () => {
  it('POSTs acceptorIdentity + secret to the correct code URL', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await acceptInvite('abc123', 'id_bob', 'supersecret');

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/invites/abc123/accept`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ acceptorIdentity: 'id_bob', secret: 'supersecret' }),
      }),
    );
  });

  it('throws when the server returns an error', async () => {
    mockFetch(() => new Response('', { status: 400 }));
    await expect(acceptInvite('bad', 'id_bob', 'wrong')).rejects.toThrow(
      'POST /invites/bad/accept failed: 400',
    );
  });

  it('URL-encodes the invite code', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await acceptInvite('code with spaces', 'id_bob', 'secret');

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/invites/code%20with%20spaces/accept`,
      expect.anything(),
    );
  });
});
