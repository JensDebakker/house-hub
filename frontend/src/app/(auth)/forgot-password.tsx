import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const msg = await forgotPassword(email.trim());
      setMessage(msg);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Forgot password</Text>
      <Text style={{ color: '#666' }}>
        Enter your account email and we'll send you a link to reset your password.
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}
      {message ? <Text style={{ color: '#2e7d32' }}>{message}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !email}
        style={({ pressed }) => [buttonStyle, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        Back to login
      </Link>
    </ScreenContainer>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
};

const buttonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 8,
  padding: 14,
  alignItems: 'center' as const,
};
