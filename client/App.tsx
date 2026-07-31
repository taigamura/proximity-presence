// Background task must be registered at module load — before any render.
import './src/platform/backgroundLocation';

import React from 'react';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/nav/AppNavigator';

// Sound and badge off globally — presence is ambient, not an alert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
