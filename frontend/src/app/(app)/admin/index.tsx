import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminUser, Role } from '@/types';

const ROLES: Role[] = ['ADMIN', 'USER', 'GUEST'];

const COLS = {
  name: 160,
  email: 220,
  verified: 80,
  role: 110,
  households: 260,
  save: 80,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [edits, setEdits] = useState<Record<string, Role>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      try {
        const { data } = await api.get<AdminUser[]>('/admin/users');
        setUsers(data);
        setEdits(Object.fromEntries(data.map((u) => [u.id, u.role])));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load users.'));
      }
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Admin</Text>
        <Text>You don&apos;t have access to this page.</Text>
      </ScreenContainer>
    );
  }

  const save = async (userId: string) => {
    setError(null);
    setSavingId(userId);
    try {
      const { data } = await api.patch<AdminUser>(`/admin/users/${userId}`, { role: edits[userId] });
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update user.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Users</Text>
      <Link href="/admin/houses" style={{ color: '#2563eb' }}>
        View houses →
      </Link>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.name}>Name</HeaderCell>
          <HeaderCell width={COLS.email}>Email</HeaderCell>
          <HeaderCell width={COLS.verified}>Verified</HeaderCell>
          <HeaderCell width={COLS.role}>Role</HeaderCell>
          <HeaderCell width={COLS.households}>Houses</HeaderCell>
          <HeaderCell width={COLS.save} />
        </HeaderRow>

        {users.map((u, index) => (
          <Row key={u.id} index={index}>
            <Cell width={COLS.name}>
              <Link href={`/admin/users/${u.id}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {u.displayName}
              </Link>
            </Cell>
            <Cell width={COLS.email}>
              <Text numberOfLines={1} style={{ color: '#666' }}>{u.email}</Text>
            </Cell>
            <Cell width={COLS.verified}>
              <Text style={{ color: u.emailVerified ? '#2e7d32' : '#c62828' }}>
                {u.emailVerified ? 'Yes' : 'No'}
              </Text>
            </Cell>
            <Cell width={COLS.role}>
              <Picker
                selectedValue={edits[u.id]}
                onValueChange={(role: Role) => setEdits((prev) => ({ ...prev, [u.id]: role }))}
                style={{ width: COLS.role }}
              >
                {ROLES.map((r) => (
                  <Picker.Item key={r} label={r} value={r} />
                ))}
              </Picker>
            </Cell>
            <Cell width={COLS.households}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {u.households.map((h) => (
                  <Link key={h.householdId} href={`/admin/houses/${h.householdId}`} style={chipStyle}>
                    {h.householdName} ({h.role})
                  </Link>
                ))}
              </View>
            </Cell>
            <Cell width={COLS.save}>
              <Pressable
                onPress={() => save(u.id)}
                disabled={savingId === u.id}
                style={({ pressed }) => [saveButtonStyle, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                  {savingId === u.id ? '…' : 'Save'}
                </Text>
              </Pressable>
            </Cell>
          </Row>
        ))}
      </TableContainer>
    </ScrollView>
  );
}

const chipStyle = {
  backgroundColor: '#eef2ff',
  color: '#2563eb',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  overflow: 'hidden' as const,
};
