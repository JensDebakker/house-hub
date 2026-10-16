import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';
import { extractInviteCode } from '@/lib/invite';
import { navigateToHref } from '@/lib/navigation';
import type { Household, HouseholdJoinRequest } from '@/types';

const JOIN_HOUSE_COLOR = '#2563eb';

export default function JoinHouseScreen() {
  const { refreshUser } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      // extractInviteCode: this field accepts either the bare code or a pasted invite link
      // (e.g. someone forwarded the whole "Share this invite code" link instead of just the
      // code) - a raw code round-trips through it unchanged.
      const { data } = await api.post<Household>('/households/join', {
        inviteCode: extractInviteCode(inviteCode),
      } satisfies HouseholdJoinRequest);
      await refreshUser();
      // navigateToHref, not a plain router.replace - fresh mount of the joined
      // household's dynamic segment (see lib/navigation.ts).
      navigateToHref(`/house/${data.id}/view`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to join house. Check the invite code and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title="Join House" color={JOIN_HOUSE_COLOR}>
      <Text style={{ color: '#666' }}>Enter the invite code or paste the invite link you were given.</Text>

      <TextInput
        placeholder="Invite code or link"
        autoCapitalize="none"
        autoCorrect={false}
        value={inviteCode}
        onChangeText={setInviteCode}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !inviteCode.trim()}
        style={({ pressed }) => [
          buttonStyle(JOIN_HOUSE_COLOR),
          (isSubmitting || !inviteCode.trim()) && { opacity: 0.6 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Joining…' : 'Join house'}
        </Text>
      </Pressable>
    </Module>
  );
}
