import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  startSignificantLocationMonitoring,
  stopMonitoring,
  toGeohash6,
} from './src/backgroundLocation';
import * as Location from 'expo-location';

// Must import to ensure TaskManager.defineTask runs at module load
import './src/backgroundLocation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [status, setStatus] = useState('idle');
  const [lastBucket, setLastBucket] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  async function handleStart() {
    setStatus('starting…');
    await startSignificantLocationMonitoring();
    setStatus('monitoring — kill the app and move ≥500m');

    // Show the current bucket immediately for reference
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    if (fg === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      const bucket = toGeohash6(loc.coords.latitude, loc.coords.longitude);
      setLastBucket(bucket);
    }
  }

  async function handleStop() {
    await stopMonitoring();
    setStatus('stopped');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Background Location Spike</Text>
      <Text style={styles.sub}>expo-location + expo-task-manager</Text>

      <Text style={styles.status}>{status}</Text>
      {lastBucket && (
        <Text style={styles.bucket}>current bucket: {lastBucket}</Text>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleStart}>
        <Text style={styles.btnText}>Start monitoring</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={handleStop}>
        <Text style={styles.btnText}>Stop monitoring</Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        {'Test steps:\n'}
        {'1. Tap "Start monitoring"\n'}
        {'2. Note your current bucket\n'}
        {'3. Kill the app (swipe up from app switcher)\n'}
        {'4. Move ≥500m\n'}
        {'5. A local notification should appear with new bucket\n'}
        {'6. The stub endpoint (httpbin.org/post) will receive the POST'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 32 },
  status: { fontSize: 15, color: '#333', marginBottom: 8, textAlign: 'center' },
  bucket: { fontSize: 13, color: '#555', marginBottom: 24, fontFamily: 'monospace' },
  btn: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnStop: { backgroundColor: '#8b0000' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  instructions: {
    marginTop: 32,
    fontSize: 13,
    color: '#555',
    lineHeight: 22,
    backgroundColor: '#e8e8e3',
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
});
