import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No verification token in this link.');
      return;
    }

    verifyEmail(token)
      .then(() => router.replace('/'))
      .catch((err) => {
        setError(getErrorMessage(err, 'This verification link is invalid or has expired.'));
      });
  }, [token]);

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
