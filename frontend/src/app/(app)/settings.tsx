import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ version: string }>('/version')
      .then(({ data }) => setVersion(data.version))
      .catch(() => setVersion(null));
  }, []);

  return (
    <BigCardShell title="Settings">
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

      {version ? (
        <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>App version: {version}</Text>
      ) : null}
    </BigCardShell>
  );
}
