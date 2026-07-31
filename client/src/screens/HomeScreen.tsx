import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PresenceDisplay } from '../ui/PresenceDisplay';
import { PresenceState } from '../domain/types';
import { startSignificantLocationMonitoring } from '../platform/backgroundLocation';
import { registerForPushNotifications } from '../platform/notifications';

export function HomeScreen() {
  const [presence, setPresence] = useState<PresenceState>({ kind: 'idle' });

  useEffect(() => {
    startSignificantLocationMonitoring().catch(console.error);
    registerForPushNotifications().catch(console.error);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PresenceDisplay state={presence} />
    </SafeAreaView>
  );
}
