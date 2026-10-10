import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';

const RESET_PASSWORD_COLOR = '#2563eb';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      setError('No reset token in this link.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const msg = await resetPassword(token, newPassword);
      setMessage(msg);
    } catch (err) {
      setError(getErrorMessage(err, 'This reset link is invalid or has expired.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Reset password</Text>

      {message ? (
        <>
          <Text style={{ color: '#2e7d32' }}>{message}</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [buttonStyle(RESET_PASSWORD_COLOR), pressed && { opacity: 0.8 }]}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Go to login</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={inputStyle}
          />

          {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={isSubmitting || !newPassword}
            style={({ pressed }) => [buttonStyle(RESET_PASSWORD_COLOR), pressed && { opacity: 0.8 }]}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </Text>
          </Pressable>

          <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
            Back to login
          </Link>
        </>
      )}
    </ScreenContainer>
  );
}
