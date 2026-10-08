import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Settings</Text>
      <Text>Signed in as {user?.email}</Text>
      <Text style={{ color: '#666' }}>Role: {user?.role}</Text>

      {user?.role === 'ADMIN' ? (
        <Link href="/(app)/admin" style={{ color: '#2563eb' }}>
          Admin
        </Link>
      ) : null}

      <Pressable
        onPress={logout}
        style={{ backgroundColor: '#dc2626', borderRadius: 8, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Log out</Text>
      </Pressable>
    </ScreenContainer>
  );
}
