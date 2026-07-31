import { relativeTime } from '../src/domain/time';
import { getMessage } from '../src/ui/PresenceDisplay';
import { PresenceState } from '../src/domain/types';

const NOW = new Date('2026-01-01T12:00:00Z');
function ts(msBefore: number): string {
  return new Date(NOW.getTime() - msBefore).toISOString();
}

describe('relativeTime', () => {
  it('returns "just now" for timestamps under 1 minute ago', () => {
    expect(relativeTime(ts(30_000), NOW)).toBe('just now');
    expect(relativeTime(ts(59_000), NOW)).toBe('just now');
  });

  it('returns "a few minutes ago" for 1–4 minutes', () => {
    expect(relativeTime(ts(60_000), NOW)).toBe('a few minutes ago');
    expect(relativeTime(ts(4 * 60_000), NOW)).toBe('a few minutes ago');
  });

  it('returns "N minutes ago" for 5–59 minutes', () => {
    expect(relativeTime(ts(5 * 60_000), NOW)).toBe('5 minutes ago');
    expect(relativeTime(ts(30 * 60_000), NOW)).toBe('30 minutes ago');
    expect(relativeTime(ts(59 * 60_000), NOW)).toBe('59 minutes ago');
  });

  it('returns "about an hour ago" for exactly 1 hour', () => {
    expect(relativeTime(ts(60 * 60_000), NOW)).toBe('about an hour ago');
  });

  it('returns "N hours ago" for multiple hours', () => {
    expect(relativeTime(ts(2 * 60 * 60_000), NOW)).toBe('2 hours ago');
    expect(relativeTime(ts(5 * 60 * 60_000), NOW)).toBe('5 hours ago');
  });
});

describe('getMessage', () => {
  it('returns the nearby string for nearby state', () => {
    const state: PresenceState = { kind: 'nearby', detectedAt: NOW.toISOString() };
    expect(getMessage(state)).toBe('Someone you know is nearby.');
  });

  it('returns empty string for idle state', () => {
    const state: PresenceState = { kind: 'idle' };
    expect(getMessage(state)).toBe('');
  });

  it('returns the permission sleeping string', () => {
    const state: PresenceState = { kind: 'sleeping', reason: 'no-background-permission' };
    expect(getMessage(state)).toContain('sleeping');
  });

  it('returns the friends sleeping string', () => {
    const state: PresenceState = { kind: 'sleeping', reason: 'no-friends' };
    expect(getMessage(state)).toContain('friends');
  });
});
