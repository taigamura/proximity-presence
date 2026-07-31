import {
  validateAccept,
  hashSecret,
  createInvite,
  Invite,
  INVITE_TTL_MS,
} from '../src/domain/invite';

const NOW = new Date('2026-01-01T12:00:00Z');
const CREATOR = 'tok_creator';
const ACCEPTOR = 'tok_acceptor';

function makeInvite(overrides: Partial<Invite> = {}): Invite {
  const secret = 'correct_secret';
  return {
    code: 'abc123',
    creatorToken: CREATOR,
    hashedSecret: hashSecret(secret),
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + INVITE_TTL_MS),
    acceptedAt: null,
    ...overrides,
  };
}

describe('createInvite', () => {
  it('returns a code, secret, hashedSecret, and expiresAt', () => {
    const result = createInvite(CREATOR, NOW);
    expect(typeof result.code).toBe('string');
    expect(result.code.length).toBeGreaterThan(0);
    expect(typeof result.secret).toBe('string');
    expect(result.hashedSecret).toBe(hashSecret(result.secret));
    expect(result.expiresAt.getTime()).toBe(NOW.getTime() + INVITE_TTL_MS);
  });

  it('produces unique codes on each call', () => {
    const a = createInvite(CREATOR, NOW);
    const b = createInvite(CREATOR, NOW);
    expect(a.code).not.toBe(b.code);
    expect(a.secret).not.toBe(b.secret);
  });
});

describe('validateAccept', () => {
  it('returns ok:true for a valid secret and fresh invite', () => {
    const invite = makeInvite();
    expect(validateAccept(invite, ACCEPTOR, 'correct_secret', NOW)).toEqual({ ok: true });
  });

  it('returns not_found when invite is null', () => {
    expect(validateAccept(null, ACCEPTOR, 'secret', NOW)).toEqual({
      ok: false, reason: 'not_found',
    });
  });

  it('returns already_used when acceptedAt is set', () => {
    const invite = makeInvite({ acceptedAt: new Date(NOW.getTime() - 1000) });
    expect(validateAccept(invite, ACCEPTOR, 'correct_secret', NOW)).toEqual({
      ok: false, reason: 'already_used',
    });
  });

  it('returns expired when expiresAt is in the past', () => {
    const invite = makeInvite({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(validateAccept(invite, ACCEPTOR, 'correct_secret', NOW)).toEqual({
      ok: false, reason: 'expired',
    });
  });

  it('returns self_invite when acceptor is the creator', () => {
    const invite = makeInvite();
    expect(validateAccept(invite, CREATOR, 'correct_secret', NOW)).toEqual({
      ok: false, reason: 'self_invite',
    });
  });

  it('returns bad_secret for a wrong secret', () => {
    const invite = makeInvite();
    expect(validateAccept(invite, ACCEPTOR, 'wrong_secret', NOW)).toEqual({
      ok: false, reason: 'bad_secret',
    });
  });
});
