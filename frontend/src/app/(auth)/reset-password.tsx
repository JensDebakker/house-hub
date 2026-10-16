import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';

const RESET_PASSWORD_COLOR = '#2563eb';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      setError(t('app.resetPassword.noToken'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const msg = await resetPassword(token, newPassword);
      setMessage(msg);
    } catch (err) {
      setError(getErrorMessage(err, t('app.resetPassword.failed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title={t('app.resetPassword.title')} color={RESET_PASSWORD_COLOR}>
      {message ? (
        <>
          <Text style={{ color: '#2e7d32' }}>{message}</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [buttonStyle(RESET_PASSWORD_COLOR), pressed && { opacity: 0.8 }]}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>{t('app.auth.goToLogin')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            placeholder={t('app.resetPassword.newPasswordPlaceholder')}
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
              {isSubmitting ? t('app.resetPassword.submitting') : t('app.resetPassword.submit')}
            </Text>
          </Pressable>

          <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
            {t('app.auth.backToLogin')}
          </Link>
        </>
      )}
    </Module>
  );
}
