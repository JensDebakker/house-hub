import { Link, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Module } from '@/components/Module';

const CHECK_EMAIL_COLOR = '#2563eb';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <Module title="Check your email" color={CHECK_EMAIL_COLOR}>
      <Text style={{ color: '#666' }}>
        We sent a verification link to {email ?? 'your email'}. Open it to activate your
        account, then come back and log in.
      </Text>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        Back to login
      </Link>
    </Module>
  );
}
