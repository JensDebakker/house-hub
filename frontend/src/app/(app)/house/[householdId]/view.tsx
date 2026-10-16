import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Module } from '@/components/Module';
import { InviteLinkButton } from '@/components/InviteLinkButton';
import { useTranslation } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import type { Household } from '@/types';

const VIEW_HOUSE_COLOR = '#db2777';

export default function ViewHouseScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { t } = useTranslation();
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    api
      .get<Household>(`/households/${householdId}`)
      .then(({ data }) => setHousehold(data))
      .catch((err) => setError(getErrorMessage(err, t('house.view.loadFailed'))));
  }, [householdId, t]);

  return (
    <Module title={t('house.view.title')} color={VIEW_HOUSE_COLOR}>
      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}
      {household ? (
        <>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{household.name}</Text>
          <Text style={{ color: '#666' }}>{t('house.view.inviteCode', { code: household.inviteCode })}</Text>
          <Text style={{ color: '#666' }}>
            {t('house.view.memberCount', { count: household.memberCount })}
          </Text>
          <InviteLinkButton inviteCode={household.inviteCode} color={VIEW_HOUSE_COLOR} />
        </>
      ) : !error ? (
        <Text style={{ color: '#999' }}>{t('common.loading')}</Text>
      ) : null}
    </Module>
  );
}
