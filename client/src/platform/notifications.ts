import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getValidToken } from '../store/tokenManager';
import { registerDeviceToken } from './api';

/**
 * Request push notification permissions, obtain the APNs device token,
 * and register it with the server linked to the current identity.
 *
 * Safe to call multiple times — expo-notifications is idempotent for
 * permission requests, and the server upserts on conflict.
 *
 * Returns true if registration succeeded, false if permissions were denied
 * or the platform doesn't support push.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const apnsToken = tokenData.data as string;

  const { token: ephemeralToken } = await getValidToken();
  await registerDeviceToken(ephemeralToken, apnsToken);

  return true;
}
