import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, type TranslationKey } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';
import { resolveDefaultHousehold } from '@/lib/households';
import { navigateToHref } from '@/lib/navigation';
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

const CONNECTION_STATUS_COPY: Record<ConnectionStatus, { dot: string; text: string; label: TranslationKey }> = {
  checking: { dot: '#9ca3af', text: '#666', label: 'app.login.connection.checking' },
  online: { dot: '#16a34a', text: '#666', label: 'app.login.connection.online' },
  offline: { dot: '#dc2626', text: '#b91c1c', label: 'app.login.connection.offline' },
};

export default function LoginScreen() {
  const { login, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [connectionStatus, retryConnection] = useConnectionStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      let currentUser = await login(email.trim(), password);
      const joinedHouseholdId = await joinPendingHousehold();
      if (joinedHouseholdId) currentUser = await refreshUser();
      // A pending invite (e.g. an existing user with House A as their default following a
      // House B invite link) takes priority over the default household - otherwise they'd
      // land back on House A instead of the House B they just joined, same bug join.tsx's
      // own direct invite-link flow already had to avoid.
      const targetHouseholdId = joinedHouseholdId ?? resolveDefaultHousehold(currentUser)?.householdId;
      // navigateToHref, not a plain router.replace - login is a fresh mount from the
      // (auth) stack every time, i.e. exactly the "dynamic segment not already mounted
      // anywhere" case a single replace doesn't reliably land on the full path for (see
      // lib/navigation.ts).
      if (targetHouseholdId) {
        navigateToHref(`/house/${targetHouseholdId}/dashboard`);
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err, t('app.login.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title={t('app.login.title')} color={LOGIN_COLOR}>
      <Text style={{ color: '#666' }}>{t('app.login.intro')}</Text>

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
          {t(CONNECTION_STATUS_COPY[connectionStatus].label)}
        </Text>
        {connectionStatus === 'offline' && (
          <Pressable onPress={retryConnection}>
            <Text style={{ color: LOGIN_COLOR, fontSize: 13, fontWeight: '600' }}>{t('common.retry')}</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        placeholder={t('app.auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <TextInput
        placeholder={t('app.auth.passwordPlaceholder')}
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
          {isSubmitting ? t('app.login.submitting') : t('app.login.submit')}
        </Text>
      </Pressable>

      <Link href="/(auth)/register" style={{ textAlign: 'center', marginTop: 8 }}>
        {t('app.login.noAccount')}
      </Link>
      <Link href="/(auth)/forgot-password" style={{ textAlign: 'center' }}>
        {t('app.login.forgotPassword')}
      </Link>
    </Module>
  );
}
