import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Household, HouseholdJoinRequest } from '@/types';

export default function JoinHouseScreen() {
  const { refreshUser } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post<Household>('/households/join', { inviteCode: inviteCode.trim() } satisfies HouseholdJoinRequest);
      await refreshUser();
      router.replace('/house/view');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to join house. Check the invite code and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BigCardShell title="Join House">
      <Text style={{ color: '#666' }}>Enter the invite code you were given.</Text>

      <TextInput
        placeholder="Invite code"
        autoCapitalize="characters"
        value={inviteCode}
        onChangeText={setInviteCode}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !inviteCode.trim()}
        style={({ pressed }) => [
          buttonStyle,
          (isSubmitting || !inviteCode.trim()) && { opacity: 0.6 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Joining…' : 'Join house'}
        </Text>
      </Pressable>
    </BigCardShell>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
};

const buttonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 8,
  padding: 14,
  alignItems: 'center' as const,
};
