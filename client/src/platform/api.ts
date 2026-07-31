import { LocationUpload } from '../domain/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function postLocation(payload: LocationUpload): Promise<void> {
  const res = await fetch(`${BASE_URL}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`POST /location failed: ${res.status}`);
  }
}
