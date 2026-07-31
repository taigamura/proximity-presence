import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '../src/store/onboarding';

// jest-expo configures @react-native-async-storage/async-storage as an
// in-memory mock automatically via the jest preset.

beforeEach(async () => {
  await resetOnboarding();
});

describe('hasCompletedOnboarding', () => {
  it('returns false when the key has never been set', async () => {
    expect(await hasCompletedOnboarding()).toBe(false);
  });

  it('returns false when the key exists but is not "true"', async () => {
    await AsyncStorage.setItem('onboarding_complete', 'false');
    expect(await hasCompletedOnboarding()).toBe(false);
  });
});

describe('markOnboardingComplete', () => {
  it('causes hasCompletedOnboarding to return true', async () => {
    await markOnboardingComplete();
    expect(await hasCompletedOnboarding()).toBe(true);
  });

  it('is idempotent — calling twice still returns true', async () => {
    await markOnboardingComplete();
    await markOnboardingComplete();
    expect(await hasCompletedOnboarding()).toBe(true);
  });
});

describe('resetOnboarding', () => {
  it('causes hasCompletedOnboarding to return false after being true', async () => {
    await markOnboardingComplete();
    await resetOnboarding();
    expect(await hasCompletedOnboarding()).toBe(false);
  });
});
