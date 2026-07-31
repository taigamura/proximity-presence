import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { toGeohash6 } from './geohash';
import { postLocation } from './api';
import { getValidToken } from '../store/tokenManager';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

export type MonitoringResult =
  | { ok: true }
  | { ok: false; reason: 'no-foreground-permission' | 'no-background-permission' };

/**
 * Core upload logic extracted for testability.
 * Called by the TaskManager task body and directly in tests.
 */
export async function uploadLocation(location: Location.LocationObject): Promise<void> {
  const { latitude, longitude } = location.coords;
  const geohash6 = toGeohash6(latitude, longitude);

  let ephemeralToken: string;
  try {
    const tokenResult = await getValidToken();
    ephemeralToken = tokenResult.token;
  } catch (err) {
    console.error('[bg] token fetch failed, skipping upload:', err);
    return;
  }

  await postLocation({ ephemeralToken, geohash6 }).catch((err) =>
    console.error('[bg] postLocation failed:', err)
  );
}

// Must be called at module load before any render.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) {
    console.error('[bg] task error:', error.message);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;
  await uploadLocation(locations[0]);
});

export async function startSignificantLocationMonitoring(): Promise<MonitoringResult> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return { ok: false, reason: 'no-foreground-permission' };

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') return { ok: false, reason: 'no-background-permission' };

  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) return { ok: true };

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 500,
    deferredUpdatesInterval: 0,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'Proximity Presence',
      notificationBody: 'Monitoring location in background',
    },
    pausesUpdatesAutomatically: true,
  });

  return { ok: true };
}

export async function stopMonitoring(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
