import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle } from '@/lib/formStyles';
import { findHouseholdMembership } from '@/lib/households';

const LEAVE_HOUSE_COLOR = '#e11d48';

export default function LeaveHouseScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const householdName = findHouseholdMembership(user, householdId)?.householdName;
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leave = async () => {
    if (!householdId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/households/${householdId}/leave`);
      await refreshUser();
      // Back to the Houses overview, not just one level up - this house no longer has a
      // card of its own to collapse back into once the user has left it.
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, t('house.leave.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert(
      t('house.leave.confirmTitle'),
      t('house.leave.confirmMessage', { name: householdName ?? t('house.leave.thisHouse') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('house.leave.confirm'), style: 'destructive', onPress: leave },
      ],
    );
  };

  if (!householdId) {
    return (
      <Module title={t('house.leave.title')} color={LEAVE_HOUSE_COLOR}>
        <Text style={{ color: '#999' }}>{t('house.leave.notInHouse')}</Text>
      </Module>
    );
  }

  return (
    <Module title={t('house.leave.title')} color={LEAVE_HOUSE_COLOR}>
      <Text style={{ color: '#666' }}>
        {t('house.leave.description', { name: householdName ?? '' })}
      </Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={confirmLeave}
        disabled={isSubmitting}
        style={({ pressed }) => [buttonStyle(LEAVE_HOUSE_COLOR), isSubmitting && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? t('house.leave.leaving') : t('house.leave.button')}
        </Text>
      </Pressable>
    </Module>
  );
}
