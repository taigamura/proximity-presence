/**
 * Payload received at POST /location.
 * The server never receives raw coordinates — only a geohash-6 bucket.
 */
export interface LocationUploadBody {
  ephemeralToken: string;
  geohash6: string;
}

export function isValidLocationUpload(body: unknown): body is LocationUploadBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.ephemeralToken === 'string' && typeof b.geohash6 === 'string';
}
