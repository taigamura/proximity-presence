import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../nav/AppNavigator';
import { fetchFriends, removeFriend, deleteAccount } from '../platform/api';
import { getValidToken, resetTokenState } from '../store/tokenManager';
import { resetOnboarding } from '../store/onboarding';
import { strings } from '../i18n/strings';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

export function FriendsScreen({ navigation }: Props) {
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [identityId, setIdentityId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    const { identityId: id } = await getValidToken();
    setIdentityId(id);
    const list = await fetchFriends(id);
    setFriends(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFriends().catch(console.error);
  }, [loadFriends]);

  function confirmRemove(friendId: string) {
    Alert.alert(
      strings.friends_report_title,
      strings.friends_report_body,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: strings.friends_report_action,
          style: 'destructive',
          onPress: async () => {
            if (!identityId) return;
            await removeFriend(identityId, friendId);
            setFriends((prev) => prev.filter((id) => id !== friendId));
          },
        },
      ],
    );
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete my data',
      'This permanently deletes your account, all friend connections, and all data stored on the server. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const { token } = await getValidToken();
              await deleteAccount(token);
            } catch {
              // Server-side deletion failed or token expired — proceed with local cleanup anyway
            }
            // Clear all local state so the app resets to onboarding on next launch.
            resetTokenState();
            await resetOnboarding();
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
      </View>
      {friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No friends yet. Share an invite link to connect.</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.friendId} numberOfLines={1}>{item}</Text>
              <TouchableOpacity onPress={() => confirmRemove(item)}>
                <Text style={styles.removeText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <View style={styles.danger}>
        <TouchableOpacity onPress={confirmDeleteAccount}>
          <Text style={styles.deleteText}>Delete my data</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  back: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
  },
  title: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  friendId: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.md,
  },
  removeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
  },
  danger: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  deleteText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});
