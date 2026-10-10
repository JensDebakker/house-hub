import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Module } from '@/components/Module';
import { InviteLinkButton } from '@/components/InviteLinkButton';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Household } from '@/types';

const VIEW_HOUSE_COLOR = '#db2777';

export default function ViewHouseScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    api
      .get<Household>(`/households/${householdId}`)
      .then(({ data }) => setHousehold(data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load house details.')));
  }, [householdId]);

  return (
    <Module title="View House" color={VIEW_HOUSE_COLOR}>
      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}
      {household ? (
        <>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{household.name}</Text>
          <Text style={{ color: '#666' }}>Invite code: {household.inviteCode}</Text>
          <Text style={{ color: '#666' }}>
            {household.memberCount} member{household.memberCount === 1 ? '' : 's'}
          </Text>
          <InviteLinkButton inviteCode={household.inviteCode} color={VIEW_HOUSE_COLOR} />
        </>
      ) : !error ? (
        <Text style={{ color: '#999' }}>Loading…</Text>
      ) : null}
    </Module>
  );
}
