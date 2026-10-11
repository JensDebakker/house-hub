import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { resolveDefaultHousehold } from '@/lib/households';
import { navigateToHref } from '@/lib/navigation';
import { joinPendingHousehold } from '@/lib/pendingInvite';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail, refreshUser } = useAuth();
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
        setVerifyError(getErrorMessage(err, 'This verification link is invalid or has expired.'));
      });
    // verifyEmail triggers a login (setUser), which would re-fire this effect on a stale token
    // if included as a dep - this is meant to run once per token, not once per auth state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const error = token ? verifyError : 'No verification token in this link.';

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Verify email</Text>

      {error ? (
        <>
          <Text style={{ color: '#c62828' }}>{error}</Text>
          <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
            Go to login
          </Link>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ color: '#666' }}>Verifying and logging you in…</Text>
        </>
      )}
    </ScreenContainer>
  );
}
