import { Link, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Check your email</Text>
      <Text style={{ color: '#666' }}>
        We sent a verification link to {email ?? 'your email'}. Open it to activate your
        account, then come back and log in.
      </Text>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        Back to login
      </Link>
    </ScreenContainer>
  );
}
