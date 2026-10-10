import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle } from '@/lib/formStyles';

const LEAVE_HOUSE_COLOR = '#e11d48';

export default function LeaveHouseScreen() {
  const { user, refreshUser } = useAuth();
  const householdId = user?.households[0]?.householdId;
  const householdName = user?.households[0]?.householdName;
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leave = async () => {
    if (!householdId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/households/${householdId}/leave`);
      await refreshUser();
      router.replace('/house');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to leave house.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert(
      'Leave house?',
      `Are you sure you want to leave ${householdName ?? 'this house'}? You'll lose access to its tasks, supplies, and files.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leave },
      ],
    );
  };

  if (!householdId) {
    return (
      <BigCardShell title="Leave House" color={LEAVE_HOUSE_COLOR}>
        <Text style={{ color: '#999' }}>You&apos;re not currently in a house.</Text>
      </BigCardShell>
    );
  }

  return (
    <BigCardShell title="Leave House" color={LEAVE_HOUSE_COLOR}>
      <Text style={{ color: '#666' }}>
        You&apos;re a member of {householdName}. Leaving removes your access to its tasks, supplies,
        shopping lists, calendar, and files.
      </Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={confirmLeave}
        disabled={isSubmitting}
        style={({ pressed }) => [buttonStyle(LEAVE_HOUSE_COLOR), isSubmitting && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Leaving…' : 'Leave house'}
        </Text>
      </Pressable>
    </BigCardShell>
  );
}
