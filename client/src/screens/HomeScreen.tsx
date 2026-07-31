import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PresenceDisplay } from '../ui/PresenceDisplay';
import { PresenceState } from '../domain/types';
import { startSignificantLocationMonitoring } from '../platform/backgroundLocation';

export function HomeScreen() {
  const [presence, setPresence] = useState<PresenceState>({ kind: 'idle' });

  useEffect(() => {
    startSignificantLocationMonitoring().catch(console.error);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PresenceDisplay state={presence} />
    </SafeAreaView>
  );
}
