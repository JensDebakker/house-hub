import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail } = useAuth();
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    verifyEmail(token)
      .then((user) => {
        const householdId = user.households[0]?.householdId;
        router.replace(householdId ? `/screensaver/${householdId}` : '/dashboard');
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
