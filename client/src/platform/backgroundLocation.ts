import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { toGeohash6 } from './geohash';
import { postLocation } from './api';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Must be called at module load before any render.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) {
    console.error('[bg] task error:', error.message);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const { latitude, longitude } = locations[0].coords;
  const geohash6 = toGeohash6(latitude, longitude);

  // ephemeralToken will be fetched from secure storage in issue #4;
  // for the skeleton, send a placeholder so the seam is wired up.
  await postLocation({ ephemeralToken: 'placeholder', geohash6 }).catch((err) =>
    console.error('[bg] postLocation failed:', err)
  );
});

export async function startSignificantLocationMonitoring(): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return;

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') return;

  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) return;

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
}

export async function stopMonitoring(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
