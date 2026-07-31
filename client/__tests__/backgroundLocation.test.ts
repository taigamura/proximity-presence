import {
  uploadLocation,
  startSignificantLocationMonitoring,
} from '../src/platform/backgroundLocation';
import * as tokenManager from '../src/store/tokenManager';
import * as api from '../src/platform/api';
import { LocationObject } from 'expo-location';

// Override expo-location with a controllable mock. The jest-expo preset
// registers the native module as non-configurable, so we replace the whole
// module here instead of using jest.spyOn per-test.
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GRANTED = { status: 'granted', granted: true, canAskAgain: false, expires: 'never' };
const DENIED  = { status: 'denied',  granted: false, canAskAgain: true,  expires: 'never' };

const MOCK_LOCATION: LocationObject = {
  coords: {
    latitude: 35.6812,
    longitude: 139.7671,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: 1700000000000,
};

describe('uploadLocation', () => {
  let getValidTokenSpy: jest.SpyInstance;
  let postLocationSpy: jest.SpyInstance;

  beforeEach(() => {
    getValidTokenSpy = jest
      .spyOn(tokenManager, 'getValidToken')
      .mockResolvedValue({ token: 'tok_test', identityId: 'id_test' });

    postLocationSpy = jest
      .spyOn(api, 'postLocation')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches a token and posts the geohash6 for a valid location', async () => {
    await uploadLocation(MOCK_LOCATION);

    expect(getValidTokenSpy).toHaveBeenCalledTimes(1);
    expect(postLocationSpy).toHaveBeenCalledTimes(1);

    const call = postLocationSpy.mock.calls[0][0];
    expect(call.ephemeralToken).toBe('tok_test');
    expect(typeof call.geohash6).toBe('string');
    expect(call.geohash6.length).toBe(6);
  });

  it('skips postLocation when getValidToken throws', async () => {
    getValidTokenSpy.mockRejectedValue(new Error('network error'));

    await expect(uploadLocation(MOCK_LOCATION)).resolves.toBeUndefined();
    expect(postLocationSpy).not.toHaveBeenCalled();
  });

  it('does not throw when postLocation fails', async () => {
    postLocationSpy.mockRejectedValue(new Error('server error'));

    await expect(uploadLocation(MOCK_LOCATION)).resolves.toBeUndefined();
  });

  it('derives a consistent geohash6 from the same coordinates', async () => {
    await uploadLocation(MOCK_LOCATION);
    await uploadLocation(MOCK_LOCATION);

    const [call1, call2] = postLocationSpy.mock.calls;
    expect(call1[0].geohash6).toBe(call2[0].geohash6);
  });
});

describe('startSignificantLocationMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(GRANTED);
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);
    (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns ok:false/no-foreground-permission when foreground is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);

    const result = await startSignificantLocationMonitoring();
    expect(result).toEqual({ ok: false, reason: 'no-foreground-permission' });
  });

  it('returns ok:false/no-background-permission when background is denied', async () => {
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue(DENIED);

    const result = await startSignificantLocationMonitoring();
    expect(result).toEqual({ ok: false, reason: 'no-background-permission' });
  });

  it('returns ok:true when both permissions are granted', async () => {
    const result = await startSignificantLocationMonitoring();
    expect(result).toEqual({ ok: true });
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('returns ok:true immediately when task is already registered', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    const result = await startSignificantLocationMonitoring();
    expect(result).toEqual({ ok: true });
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});
