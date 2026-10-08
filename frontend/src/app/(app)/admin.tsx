import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminUser, Household, HouseholdRole, Role } from '@/types';

const ROLES: Role[] = ['ADMIN', 'USER', 'GUEST'];
const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

const COLS = {
  name: 150,
  email: 220,
  verified: 80,
  role: 110,
  household: 180,
  householdRole: 130,
  save: 80,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

type Edits = Record<string, { role: Role; householdId: string; householdRole: HouseholdRole }>;

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      try {
        const [usersRes, householdsRes] = await Promise.all([
          api.get<AdminUser[]>('/admin/users'),
          api.get<Household[]>('/admin/households'),
        ]);
        setUsers(usersRes.data);
        setHouseholds(householdsRes.data);
        setEdits(
          Object.fromEntries(
            usersRes.data.map((u) => [
              u.id,
              { role: u.role, householdId: u.householdId, householdRole: u.householdRole },
            ]),
          ),
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load users.'));
      }
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Admin</Text>
        <Text>You don't have access to this page.</Text>
      </ScreenContainer>
    );
  }

  const setEdit = (userId: string, patch: Partial<Edits[string]>) => {
    setEdits((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  };

  const save = async (userId: string) => {
    setError(null);
    setSavingId(userId);
    try {
      const { data } = await api.patch<AdminUser>(`/admin/users/${userId}`, edits[userId]);
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update user.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Admin</Text>
      <Text style={{ color: '#666' }}>Assign roles, households, and household roles.</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <ScrollView horizontal>
        <View style={{ width: TABLE_WIDTH, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
          <View style={[rowStyle, { backgroundColor: '#f5f5f5' }]}>
            <HeaderCell width={COLS.name}>Name</HeaderCell>
            <HeaderCell width={COLS.email}>Email</HeaderCell>
            <HeaderCell width={COLS.verified}>Verified</HeaderCell>
            <HeaderCell width={COLS.role}>Role</HeaderCell>
            <HeaderCell width={COLS.household}>Household</HeaderCell>
            <HeaderCell width={COLS.householdRole}>Household role</HeaderCell>
            <HeaderCell width={COLS.save} />
          </View>

          {users.map((u, index) => {
            const edit = edits[u.id];
            if (!edit) return null;

            return (
              <View
                key={u.id}
                style={[rowStyle, index % 2 === 1 && { backgroundColor: '#fafafa' }]}
              >
                <Cell width={COLS.name}>
                  <Text numberOfLines={1}>{u.displayName}</Text>
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
                    selectedValue={edit.role}
                    onValueChange={(role: Role) => setEdit(u.id, { role })}
                    style={{ width: COLS.role }}
                  >
                    {ROLES.map((r) => (
                      <Picker.Item key={r} label={r} value={r} />
                    ))}
                  </Picker>
                </Cell>
                <Cell width={COLS.household}>
                  <Picker
                    selectedValue={edit.householdId}
                    onValueChange={(householdId: string) => setEdit(u.id, { householdId })}
                    style={{ width: COLS.household }}
                  >
                    {households.map((h) => (
                      <Picker.Item key={h.id} label={h.name} value={h.id} />
                    ))}
                  </Picker>
                </Cell>
                <Cell width={COLS.householdRole}>
                  <Picker
                    selectedValue={edit.householdRole}
                    onValueChange={(householdRole: HouseholdRole) => setEdit(u.id, { householdRole })}
                    style={{ width: COLS.householdRole }}
                  >
                    {HOUSEHOLD_ROLES.map((r) => (
                      <Picker.Item key={r} label={r} value={r} />
                    ))}
                  </Picker>
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
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

function HeaderCell({ width, children }: { width: number; children?: string }) {
  return (
    <View style={{ width, padding: 8 }}>
      <Text style={{ fontWeight: '700', fontSize: 13 }}>{children}</Text>
    </View>
  );
}

function Cell({ width, children }: { width: number; children: React.ReactNode }) {
  return <View style={{ width, padding: 8, justifyContent: 'center' }}>{children}</View>;
}

const rowStyle = {
  flexDirection: 'row' as const,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
};

const saveButtonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 6,
  paddingVertical: 8,
  alignItems: 'center' as const,
};
