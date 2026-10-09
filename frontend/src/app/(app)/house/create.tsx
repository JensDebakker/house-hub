import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Household, HouseholdCreateRequest } from '@/types';

const CREATE_HOUSE_COLOR = '#c026d3';

export default function CreateHouseScreen() {
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<Household | null>(null);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post<Household>('/households', { name: name.trim() } satisfies HouseholdCreateRequest);
      await refreshUser();
      setCreated(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create house.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <BigCardShell title="Create House" color={CREATE_HOUSE_COLOR}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{created.name} is ready!</Text>
        <Text style={{ color: '#666' }}>Share this invite code so others can join:</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: 2 }}>{created.inviteCode}</Text>

        <Pressable
          onPress={() => router.replace('/house/view')}
          style={({ pressed }) => [buttonStyle, pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>View house</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/house')}
          style={({ pressed }) => [secondaryButtonStyle, pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: '#111827', fontWeight: '600' }}>Back to house menu</Text>
        </Pressable>
      </BigCardShell>
    );
  }

  return (
    <BigCardShell title="Create House" color={CREATE_HOUSE_COLOR}>
      <Text style={{ color: '#666' }}>Give your new house a name.</Text>

      <TextInput
        placeholder="House name"
        value={name}
        onChangeText={setName}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !name.trim()}
        style={({ pressed }) => [buttonStyle, (isSubmitting || !name.trim()) && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Creating…' : 'Create house'}
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
  backgroundColor: '#c026d3',
  borderRadius: 8,
  padding: 14,
  alignItems: 'center' as const,
};

const secondaryButtonStyle = {
  backgroundColor: '#e5e7eb',
  borderRadius: 8,
  padding: 14,
  alignItems: 'center' as const,
};
