import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token in this link.');
      return;
    }

    verifyEmail(token)
      .then((msg) => {
        setStatus('success');
        setMessage(msg);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(getErrorMessage(err, 'This verification link is invalid or has expired.'));
      });
  }, [token]);

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Verify email</Text>

      {status === 'pending' ? <ActivityIndicator /> : null}

      {message ? (
        <Text style={{ color: status === 'error' ? '#c62828' : '#2e7d32' }}>{message}</Text>
      ) : null}

      {status !== 'pending' ? (
        <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
          Go to login
        </Link>
      ) : null}
    </ScreenContainer>
  );
}
