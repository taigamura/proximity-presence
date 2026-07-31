import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import ngeohash from 'ngeohash';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const STUB_ENDPOINT = 'https://httpbin.org/post'; // replace with real endpoint

/**
 * Compute geohash-6 bucket from coordinates.
 * geohash-6 cells are ~1.2km × 0.6km — coarse enough that the server never
 * receives precise coordinates, only the bucket string.
 */
export function toGeohash6(latitude: number, longitude: number): string {
  return ngeohash.encode(latitude, longitude, 6);
}

/**
 * Post geohash bucket to the stub endpoint.
 * In production this becomes: POST /location { ephemeralToken, geohash6 }
 */
async function postBucket(geohash6: string): Promise<void> {
  const body = JSON.stringify({ geohash6, ts: new Date().toISOString() });
  try {
    const res = await fetch(STUB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    console.log('[spike] POST response', res.status, body);
  } catch (err) {
    console.error('[spike] POST failed', err);
  }
}

// TaskManager.defineTask must be called at module load — before the app renders.
// This file is imported from App.tsx at the top level to satisfy that requirement.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[spike] background task error:', error.message);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const { latitude, longitude } = locations[0].coords;
  const geohash6 = toGeohash6(latitude, longitude);

  console.log(`[spike] background wake — lat=${latitude} lon=${longitude} bucket=${geohash6}`);
  await postBucket(geohash6);

  // Local notification so the tester can confirm the task fired on device
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Spike: background location fired',
      body: `bucket=${geohash6}`,
      sound: false,
    },
    trigger: null, // fire immediately
  });
});

export async function startSignificantLocationMonitoring(): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    console.warn('[spike] foreground location denied');
    return;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') {
    console.warn('[spike] background location denied — spike cannot run');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    console.log('[spike] task already registered');
    return;
  }

  // Significant-location-change: wakes app on ~500m movement, low battery impact.
  // deferredUpdatesInterval: 0 means deliver as soon as the OS fires.
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    // Significant-location-change mode: the OS decides when to fire (~500m).
    // Setting a large distance/time interval effectively uses SLC semantics on iOS.
    distanceInterval: 500,
    deferredUpdatesInterval: 0,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'Proximity Presence',
      notificationBody: 'Monitoring location in background',
    },
    pausesUpdatesAutomatically: true,
  });

  console.log('[spike] significant-location-change monitoring started');
}

export async function stopMonitoring(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    console.log('[spike] monitoring stopped');
  }
}
