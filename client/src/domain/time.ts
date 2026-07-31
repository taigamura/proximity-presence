/**
 * Returns a short human-readable relative time string for a past ISO timestamp.
 * Used for the single-glance presence caption — kept intentionally vague so it
 * stays meditative rather than precise.
 */
export function relativeTime(isoTimestamp: string, now: Date): string {
  const diffMs = now.getTime() - new Date(isoTimestamp).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 5) return 'a few minutes ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return 'about an hour ago';
  return `${diffHr} hours ago`;
}
