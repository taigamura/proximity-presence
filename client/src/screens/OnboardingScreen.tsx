import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../nav/AppNavigator';
import { strings } from '../i18n/strings';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { startSignificantLocationMonitoring } from '../platform/backgroundLocation';
import { markOnboardingComplete } from '../store/onboarding';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  async function handleEnable() {
    await markOnboardingComplete();
    await startSignificantLocationMonitoring();
    navigation.replace('Home');
  }

  async function handleSkip() {
    await markOnboardingComplete();
    navigation.replace('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{strings.onboarding_title}</Text>
        <Text style={styles.body}>{strings.onboarding_body}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleEnable}>
          <Text style={styles.ctaText}>{strings.onboarding_cta}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>{strings.onboarding_skip}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    lineHeight: 26,
  },
  actions: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  ctaText: {
    ...TYPOGRAPHY.body,
    color: COLORS.surface,
    fontWeight: '500',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
});
