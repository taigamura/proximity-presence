import { PresenceState } from '../domain/types';

export interface AppState {
  presence: PresenceState;
  hasBackgroundPermission: boolean;
  friendCount: number;
}

export const initialState: AppState = {
  presence: { kind: 'idle' },
  hasBackgroundPermission: false,
  friendCount: 0,
};
