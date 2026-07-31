import { uploadLocation } from '../src/platform/backgroundLocation';
import * as tokenManager from '../src/store/tokenManager';
import * as api from '../src/platform/api';
import { LocationObject } from 'expo-location';

// expo-location and expo-task-manager are native modules — jest-expo maps them
// to stubs automatically via the jest-expo preset.

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
