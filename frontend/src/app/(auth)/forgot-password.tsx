import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';

const FORGOT_PASSWORD_COLOR = '#2563eb';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const { t } = useTranslation();
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
      setError(getErrorMessage(err, t('app.forgotPassword.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title={t('app.forgotPassword.title')} color={FORGOT_PASSWORD_COLOR}>
      <Text style={{ color: '#666' }}>
        {t('app.forgotPassword.intro')}
      </Text>

      <TextInput
        placeholder={t('app.auth.emailPlaceholder')}
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
        style={({ pressed }) => [buttonStyle(FORGOT_PASSWORD_COLOR), pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? t('app.forgotPassword.submitting') : t('app.forgotPassword.submit')}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        {t('app.auth.backToLogin')}
      </Link>
    </Module>
  );
}
