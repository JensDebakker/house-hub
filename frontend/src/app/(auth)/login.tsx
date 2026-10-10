import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';
import { joinPendingHousehold } from '@/lib/pendingInvite';

const LOGIN_COLOR = '#2563eb';

export default function LoginScreen() {
  const { login, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      if (await joinPendingHousehold()) await refreshUser();
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Check your email and password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>House Hub</Text>
      <Text style={{ color: '#666' }}>Log in to your house</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !email || !password}
        style={({ pressed }) => [buttonStyle(LOGIN_COLOR), pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Text>
      </Pressable>

      <Link href="/(auth)/register" style={{ textAlign: 'center', marginTop: 8 }}>
        No account yet? Register
      </Link>
      <Link href="/(auth)/forgot-password" style={{ textAlign: 'center' }}>
        Forgot your password?
      </Link>
    </ScreenContainer>
  );
}
