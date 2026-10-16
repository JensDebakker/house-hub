import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { resolveDefaultHousehold } from '@/lib/households';
import { navigateToHref } from '@/lib/navigation';
import { joinPendingHousehold } from '@/lib/pendingInvite';

const VERIFY_EMAIL_COLOR = '#2563eb';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    verifyEmail(token)
      .then(async (initialUser) => {
        const joinedHouseholdId = await joinPendingHousehold();
        const currentUser = joinedHouseholdId ? await refreshUser() : initialUser;
        // A pending invite takes priority over the default household - same reasoning as
        // login.tsx (verifying email after following a join link while unverified
        // shouldn't strand the user on their own default household instead of the one
        // they actually followed the link for).
        const targetHouseholdId = joinedHouseholdId ?? resolveDefaultHousehold(currentUser)?.householdId;
        // navigateToHref, not a plain router.replace - same reasoning as login.tsx: this
        // is a fresh mount of the household's dynamic segment, which a single replace
        // doesn't reliably land on the full path for (see lib/navigation.ts).
        if (targetHouseholdId) {
          navigateToHref(`/house/${targetHouseholdId}/dashboard`);
        } else {
          router.replace('/dashboard');
        }
      })
      .catch((err) => {
        setVerifyError(getErrorMessage(err, t('app.verifyEmail.failed')));
      });
    // verifyEmail triggers a login (setUser), which would re-fire this effect on a stale token
    // if included as a dep - this is meant to run once per token, not once per auth state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const error = token ? verifyError : t('app.verifyEmail.noToken');

  return (
    <Module title={t('app.verifyEmail.title')} color={VERIFY_EMAIL_COLOR}>
      {error ? (
        <>
          <Text style={{ color: '#c62828' }}>{error}</Text>
          <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
            {t('app.auth.goToLogin')}
          </Link>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ color: '#666' }}>{t('app.verifyEmail.verifying')}</Text>
        </>
      )}
    </Module>
  );
}
