import { LocationUpload, EphemeralToken } from '../domain/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function fetchToken(identityId?: string): Promise<EphemeralToken & { identityId: string }> {
  const res = await fetch(`${BASE_URL}/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identityId ? { identityId } : {}),
  });
  if (!res.ok) {
    throw new Error(`POST /tokens failed: ${res.status}`);
  }
  const data = await res.json();
  return {
    value: data.token,
    identityId: data.identityId,
    expiresAt: data.expiresAt,
  };
}

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

export async function registerDeviceToken(ephemeralToken: string, apnsToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/device-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ephemeralToken, apnsToken }),
  });
  if (!res.ok) {
    throw new Error(`POST /device-token failed: ${res.status}`);
  }
}
