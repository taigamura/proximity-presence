import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { hasCompletedOnboarding } from '../store/onboarding';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Friends: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    hasCompletedOnboarding().then((done) => {
      setInitialRoute(done ? 'Home' : 'Onboarding');
    });
  }, []);

  // Render nothing until we know the initial route (avoids flash).
  if (initialRoute === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
