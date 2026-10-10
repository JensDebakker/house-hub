import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { HouseholdMember } from '@/types';

const MANAGE_HOUSE_COLOR = '#0f766e';

export default function ManageHouseScreen() {
  const { user } = useAuth();
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const myRole = user?.households.find((h) => h.householdId === householdId)?.role;
  const isOwner = myRole === 'OWNER';

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!householdId) return;
    try {
      const { data } = await api.get<HouseholdMember[]>(`/households/${householdId}/members`);
      setMembers(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load members.'));
    }
  }, [householdId]);

  useEffect(() => {
    (async () => {
      await loadMembers();
    })();
  }, [loadMembers]);

  const removeMember = async (userId: string) => {
    if (!householdId) return;
    setError(null);
    setBusyUserId(userId);
    try {
      await api.delete(`/households/${householdId}/members/${userId}`);
      await loadMembers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member.'));
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemove = (member: HouseholdMember) => {
    Alert.alert(
      'Remove member?',
      `Remove ${member.displayName} from this house? They'll lose access to its tasks, supplies, and files.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMember(member.userId) },
      ],
    );
  };

  if (!householdId) {
    return (
      <Module title="Manage House" color={MANAGE_HOUSE_COLOR}>
        <Text style={{ color: '#999' }}>You&apos;re not currently in a house.</Text>
      </Module>
    );
  }

  return (
    <Module title="Manage House" color={MANAGE_HOUSE_COLOR}>
      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      {members.length === 0 && !error ? <Text style={{ color: '#999' }}>Loading…</Text> : null}

      {members.map((member) => {
        const isSelf = member.userId === user?.id;
        return (
          <View
            key={member.userId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>
                {member.displayName}
                {isSelf ? ' (you)' : ''}
              </Text>
              <Text style={{ color: '#666', fontSize: 13 }}>{member.email}</Text>
            </View>

            <View
              style={{
                backgroundColor: member.role === 'OWNER' ? '#0f766e' : '#9ca3af',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginRight: isOwner && !isSelf ? 10 : 0,
              }}
            >
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{member.role}</Text>
            </View>

            {isOwner && !isSelf ? (
              <Pressable
                onPress={() => confirmRemove(member)}
                disabled={busyUserId === member.userId}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#e11d48',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  },
                  busyUserId === member.userId && { opacity: 0.6 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={() => router.push(`/house/${householdId}/leave`)}
        style={({ pressed }) => [
          { backgroundColor: '#e11d48', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Leave house</Text>
      </Pressable>
    </Module>
  );
}
