import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_complete';

/** Returns true if the user has already seen and completed onboarding. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === 'true';
}

/** Persist that onboarding is complete so it never shows again. */
export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}

/** Reset onboarding state — used in tests only. */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
