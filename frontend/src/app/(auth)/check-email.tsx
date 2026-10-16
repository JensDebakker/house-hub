import { Link, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Module } from '@/components/Module';
import { useTranslation } from '@/i18n';

const CHECK_EMAIL_COLOR = '#2563eb';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { t } = useTranslation();

  return (
    <Module title={t('app.checkEmail.title')} color={CHECK_EMAIL_COLOR}>
      <Text style={{ color: '#666' }}>
        {t('app.checkEmail.body', { email: email ?? t('app.checkEmail.yourEmail') })}
      </Text>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        {t('app.auth.backToLogin')}
      </Link>
    </Module>
  );
}
