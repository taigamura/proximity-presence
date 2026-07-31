import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { PresenceDisplay } from '../ui/PresenceDisplay';
import { PresenceState } from '../domain/types';
import { startSignificantLocationMonitoring } from '../platform/backgroundLocation';
import { registerForPushNotifications } from '../platform/notifications';
import { fetchFriendCount } from '../platform/api';
import { getValidToken } from '../store/tokenManager';

export function HomeScreen() {
  const [presence, setPresence] = useState<PresenceState>({ kind: 'idle' });
  const listenerRef = useRef<Notifications.Subscription | null>(null);

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

    // Listen for incoming notifications (including silent content-available pushes).
    // Any incoming notification means the server matched a nearby friend.
    listenerRef.current = Notifications.addNotificationReceivedListener(() => {
      setPresence({ kind: 'nearby', detectedAt: new Date().toISOString() });
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PresenceDisplay state={presence} />
    </SafeAreaView>
  );
}
