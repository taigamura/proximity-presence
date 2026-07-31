import { LocationUpload, EphemeralToken, InviteResult } from '../domain/types';

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

/**
 * Generate an invite link. Returns the one-time secret that the user must
 * share out-of-band with the intended recipient. The secret is never stored
 * by the server — only its SHA-256 hash is persisted.
 */
export async function generateInvite(identityId: string): Promise<InviteResult> {
  const res = await fetch(`${BASE_URL}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorIdentity: identityId }),
  });
  if (!res.ok) {
    throw new Error(`POST /invites failed: ${res.status}`);
  }
  return res.json() as Promise<InviteResult>;
}

/**
 * Accept an invite. The recipient supplies the invite code (from the link)
 * and the shared secret (sent out-of-band). On success the server creates a
 * friend edge keyed to the two identity IDs.
 */
export async function acceptInvite(
  code: string,
  identityId: string,
  secret: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/invites/${encodeURIComponent(code)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acceptorIdentity: identityId, secret }),
  });
  if (!res.ok) {
    throw new Error(`POST /invites/${code}/accept failed: ${res.status}`);
  }
}

/**
 * Fetch the current friend count and whether it meets the minimum-friends gate.
 * The client uses this to decide whether to enter the sleeping/no-friends state.
 */
export async function fetchFriendCount(
  identityId: string,
): Promise<{ count: number; meetsGate: boolean }> {
  const res = await fetch(`${BASE_URL}/friends/count`, {
    method: 'GET',
    headers: { 'x-identity-id': identityId },
  });
  if (!res.ok) {
    throw new Error(`GET /friends/count failed: ${res.status}`);
  }
  return res.json() as Promise<{ count: number; meetsGate: boolean }>;
}

/** Fetch the list of friend identity IDs for the given identity. */
export async function fetchFriends(identityId: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/friends`, {
    method: 'GET',
    headers: { 'x-identity-id': identityId },
  });
  if (!res.ok) {
    throw new Error(`GET /friends failed: ${res.status}`);
  }
  const data = await res.json() as { friends: string[] };
  return data.friends;
}

/**
 * Remove (block) a friend — severs the edge on both sides.
 * After this call the two identities will no longer match or receive pushes
 * for each other.
 */
export async function removeFriend(
  identityId: string,
  friendIdentityId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/friends/${encodeURIComponent(friendIdentityId)}`,
    {
      method: 'DELETE',
      headers: { 'x-identity-id': identityId },
    },
  );
  if (!res.ok) {
    throw new Error(`DELETE /friends/${friendIdentityId} failed: ${res.status}`);
  }
}
