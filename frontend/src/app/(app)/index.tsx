import { Link } from 'expo-router';
import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>
        Welcome{user ? `, ${user.displayName}` : ''}
      </Text>
      <Text style={{ color: '#666' }}>
        This is the household dashboard. Tasks, shopping lists, supplies, and the calendar
        all feed the screensaver display.
      </Text>

      <Link
        href={user ? { pathname: '/screensaver/[householdId]', params: { householdId: user.householdId } } : '/'}
        style={{ color: '#2563eb', marginTop: 8 }}
      >
        Open the screensaver preview →
      </Link>
    </ScreenContainer>
  );
}
