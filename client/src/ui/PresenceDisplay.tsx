import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PresenceState } from '../domain/types';
import { strings } from '../i18n/strings';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { relativeTime } from '../domain/time';

interface Props {
  state: PresenceState;
  now?: Date;
}

export function PresenceDisplay({ state, now = new Date() }: Props) {
  const message = getMessage(state);
  const caption = state.kind === 'nearby' ? relativeTime(state.detectedAt, now) : null;

  return (
    <View style={styles.container}>
      {message ? <Text style={styles.text}>{message}</Text> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

export function getMessage(state: PresenceState): string {
  switch (state.kind) {
    case 'nearby':
      return strings.nearby;
    case 'sleeping':
      return state.reason === 'no-background-permission'
        ? strings.sleeping_permission
        : strings.sleeping_friends;
    case 'idle':
      return strings.idle;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  text: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    textAlign: 'center',
  },
  caption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
