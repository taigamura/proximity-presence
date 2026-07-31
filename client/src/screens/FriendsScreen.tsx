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
import { fetchFriends, removeFriend } from '../platform/api';
import { getValidToken } from '../store/tokenManager';
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
      'Remove friend',
      'This will sever the connection on both sides. Neither of you will receive presence signals from the other.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
});
