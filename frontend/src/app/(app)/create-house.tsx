import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { InviteLinkButton } from '@/components/InviteLinkButton';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';
import { navigateToHref } from '@/lib/navigation';
import type { Household, HouseholdCreateRequest } from '@/types';

const CREATE_HOUSE_COLOR = '#c026d3';

export default function CreateHouseScreen() {
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
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
      setError(getErrorMessage(err, t('app.createHouse.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <Module title={t('app.createHouse.title')} color={CREATE_HOUSE_COLOR}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{t('app.createHouse.ready', { name: created.name })}</Text>
        <Text style={{ color: '#666' }}>{t('app.createHouse.shareCode')}</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: 2 }}>{created.inviteCode}</Text>
        <InviteLinkButton inviteCode={created.inviteCode} color={CREATE_HOUSE_COLOR} />

        <Pressable
          // navigateToHref, not a plain router.replace - fresh mount of the newly-created
          // household's dynamic segment (see lib/navigation.ts).
          onPress={() => navigateToHref(`/house/${created.id}/view`)}
          style={({ pressed }) => [buttonStyle(CREATE_HOUSE_COLOR), pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{t('app.createHouse.viewHouse')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/dashboard')}
          style={({ pressed }) => [buttonStyle('#e5e7eb'), pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: '#111827', fontWeight: '600' }}>{t('app.createHouse.backToOverview')}</Text>
        </Pressable>
      </Module>
    );
  }

  return (
    <Module title={t('app.createHouse.title')} color={CREATE_HOUSE_COLOR}>
      <Text style={{ color: '#666' }}>{t('app.createHouse.intro')}</Text>

      <TextInput
        placeholder={t('app.createHouse.namePlaceholder')}
        value={name}
        onChangeText={setName}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !name.trim()}
        style={({ pressed }) => [
          buttonStyle(CREATE_HOUSE_COLOR),
          (isSubmitting || !name.trim()) && { opacity: 0.6 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? t('app.createHouse.submitting') : t('app.createHouse.submit')}
        </Text>
      </Pressable>
    </Module>
  );
}
