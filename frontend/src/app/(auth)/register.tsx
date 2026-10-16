import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';

const REGISTER_COLOR = '#16a34a';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      await register(trimmedEmail, password, displayName.trim());
      router.replace({ pathname: '/(auth)/check-email', params: { email: trimmedEmail } });
    } catch (err) {
      setError(getErrorMessage(err, t('app.register.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title={t('app.register.title')} color={REGISTER_COLOR}>
      <Text style={{ color: '#666' }}>{t('app.register.intro')}</Text>

      <TextInput
        placeholder={t('app.register.displayNamePlaceholder')}
        value={displayName}
        onChangeText={setDisplayName}
        style={inputStyle}
      />
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
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !email || !password || !displayName}
        style={({ pressed }) => [buttonStyle(REGISTER_COLOR), pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? t('app.register.submitting') : t('app.register.submit')}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        {t('app.register.haveAccount')}
      </Link>
    </Module>
  );
}
