import { EphemeralToken } from '../domain/types';
import { fetchToken } from '../platform/api';

/** Refresh the token this many ms before it expires. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export interface TokenState {
  token: EphemeralToken | null;
  identityId: string | null;
}

let _state: TokenState = { token: null, identityId: null };

export function getTokenState(): TokenState {
  return _state;
}

/** Returns a valid token, refreshing if absent or expiring soon. */
export async function getValidToken(): Promise<{ token: string; identityId: string }> {
  const now = Date.now();
  const { token, identityId } = _state;

  const needsRefresh =
    !token ||
    !identityId ||
    new Date(token.expiresAt).getTime() - now < REFRESH_BUFFER_MS;

  if (needsRefresh) {
    const result = await fetchToken(identityId ?? undefined);
    _state = {
      token: { value: result.value, expiresAt: result.expiresAt },
      identityId: result.identityId,
    };
  }

  return {
    token: _state.token!.value,
    identityId: _state.identityId!,
  };
}

/** Reset state — used in tests. */
export function resetTokenState(): void {
  _state = { token: null, identityId: null };
}
