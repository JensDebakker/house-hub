import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AdminActionButton, Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { Module } from '@/components/Module';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { AdminUser, Role } from '@/types';

const USERS_COLOR = '#2563eb';
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
  const isAdmin = useRequireAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [edits, setEdits] = useState<Record<string, Role>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) => u.displayName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  if (!isAdmin) {
    return (
      <Module title="Users" color={USERS_COLOR}>
        <Text>You don&apos;t have access to this page.</Text>
      </Module>
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
    <Module title="Users" color={USERS_COLOR}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or email…"
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, backgroundColor: 'white' }}
      />

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

        {filteredUsers.map((u, index) => (
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
              <AdminActionButton label="Save" onPress={() => save(u.id)} busy={savingId === u.id} small />
            </Cell>
          </Row>
        ))}
      </TableContainer>
    </Module>
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
