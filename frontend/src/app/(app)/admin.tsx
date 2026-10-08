import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminUser, Household, HouseholdRole, Role } from '@/types';

const ROLES: Role[] = ['ADMIN', 'USER', 'GUEST'];
const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

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
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Admin</Text>
      <Text style={{ color: '#666' }}>Assign roles, households, and household roles.</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      {users.map((u) => {
        const edit = edits[u.id];
        if (!edit) return null;

        return (
          <View key={u.id} style={cardStyle}>
            <Text style={{ fontWeight: '600' }}>{u.displayName}</Text>
            <Text style={{ color: '#666' }}>{u.email}</Text>
            <Text style={{ color: u.emailVerified ? '#2e7d32' : '#c62828', fontSize: 12 }}>
              {u.emailVerified ? 'Email verified' : 'Email not verified'}
            </Text>

            <Text style={labelStyle}>Role</Text>
            <ChipRow
              options={ROLES}
              selected={edit.role}
              onSelect={(role) => setEdit(u.id, { role })}
            />

            <Text style={labelStyle}>Household</Text>
            <ChipRow
              options={households.map((h) => h.id)}
              labels={households.map((h) => h.name)}
              selected={edit.householdId}
              onSelect={(householdId) => setEdit(u.id, { householdId })}
            />

            <Text style={labelStyle}>Household role</Text>
            <ChipRow
              options={HOUSEHOLD_ROLES}
              selected={edit.householdRole}
              onSelect={(householdRole) => setEdit(u.id, { householdRole })}
            />

            <Pressable
              onPress={() => save(u.id)}
              disabled={savingId === u.id}
              style={({ pressed }) => [saveButtonStyle, pressed && { opacity: 0.8 }]}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {savingId === u.id ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScreenContainer>
  );
}

function ChipRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
}: {
  options: T[];
  labels?: string[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option, index) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[chipStyle, isSelected && chipSelectedStyle]}
          >
            <Text style={{ color: isSelected ? 'white' : '#333', fontSize: 13 }}>
              {labels?.[index] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const cardStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
  gap: 6,
};

const labelStyle = {
  fontSize: 12,
  color: '#666',
  marginTop: 4,
};

const chipStyle = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 16,
  paddingVertical: 6,
  paddingHorizontal: 12,
};

const chipSelectedStyle = {
  backgroundColor: '#2563eb',
  borderColor: '#2563eb',
};

const saveButtonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 8,
  padding: 10,
  alignItems: 'center' as const,
  marginTop: 4,
};
