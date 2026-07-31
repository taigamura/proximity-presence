import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { PresenceDisplay } from '../ui/PresenceDisplay';
import { PresenceState } from '../domain/types';
import { startSignificantLocationMonitoring } from '../platform/backgroundLocation';
import { registerForPushNotifications } from '../platform/notifications';
import { fetchFriendCount } from '../platform/api';
import { getValidToken } from '../store/tokenManager';

/** Nearby state fades back to idle after this duration (meditative, not alert-like). */
const NEARBY_FADE_MS = 30 * 60 * 1000; // 30 minutes

export function HomeScreen() {
  const [presence, setPresence] = useState<PresenceState>({ kind: 'idle' });
  const listenerRef = useRef<Notifications.Subscription | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setNearby(detectedAt: string) {
    setPresence({ kind: 'nearby', detectedAt });
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setPresence({ kind: 'idle' });
    }, NEARBY_FADE_MS);
  }

  useEffect(() => {
    // Check minimum-friends gate first; enter sleeping state if not met.
    getValidToken().then(({ identityId }) =>
      fetchFriendCount(identityId).then(({ meetsGate }) => {
        if (!meetsGate) {
          setPresence({ kind: 'sleeping', reason: 'no-friends' });
        }
      })
    ).catch(console.error);

    // Start background location monitoring; degrade to sleeping on denial.
    startSignificantLocationMonitoring().then((result) => {
      if (!result.ok) {
        setPresence({ kind: 'sleeping', reason: 'no-background-permission' });
      }
    }).catch(console.error);

    // Register APNs device token so the server can push to this device.
    registerForPushNotifications().catch(console.error);

    // Listen for incoming notifications — any push means a nearby friend was matched.
    listenerRef.current = Notifications.addNotificationReceivedListener(() => {
      setNearby(new Date().toISOString());
    });

    return () => {
      listenerRef.current?.remove();
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PresenceDisplay state={presence} />
    </SafeAreaView>
  );
}
