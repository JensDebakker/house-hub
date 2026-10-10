import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';
import { joinPendingHousehold } from '@/lib/pendingInvite';

const LOGIN_COLOR = '#2563eb';

type ConnectionStatus = 'checking' | 'online' | 'offline';

/** Pings the public /version endpoint so the login screen can tell "can't reach the
 * server" apart from "wrong credentials" before the user even types anything - both
 * previously surfaced as the same generic "Login failed" message. */
function useConnectionStatus(): [ConnectionStatus, () => void] {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/version', { timeout: 5000 })
      .then(() => {
        if (!cancelled) setStatus('online');
      })
      .catch(() => {
        if (!cancelled) setStatus('offline');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setStatus('checking');
    setAttempt((a) => a + 1);
  };

  return [status, retry];
}

const CONNECTION_STATUS_COPY: Record<ConnectionStatus, { dot: string; text: string; label: string }> = {
  checking: { dot: '#9ca3af', text: '#666', label: 'Checking connection…' },
  online: { dot: '#16a34a', text: '#666', label: 'Connected' },
  offline: { dot: '#dc2626', text: '#b91c1c', label: "Can't reach the server" },
};

export default function LoginScreen() {
  const { login, refreshUser } = useAuth();
  const [connectionStatus, retryConnection] = useConnectionStatus();
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: CONNECTION_STATUS_COPY[connectionStatus].dot,
          }}
        />
        <Text style={{ color: CONNECTION_STATUS_COPY[connectionStatus].text, fontSize: 13 }}>
          {CONNECTION_STATUS_COPY[connectionStatus].label}
        </Text>
        {connectionStatus === 'offline' && (
          <Pressable onPress={retryConnection}>
            <Text style={{ color: LOGIN_COLOR, fontSize: 13, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        )}
      </View>

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
