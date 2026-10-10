import { Picker } from '@react-native-picker/picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AdminActionButton, Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { Household, HouseholdRole, UserDetail } from '@/types';

const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

export default function AdminUserDetailScreen() {
  const isAdmin = useRequireAdmin();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newHouseholdId, setNewHouseholdId] = useState('');
  const [newRole, setNewRole] = useState<HouseholdRole>('MEMBER');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detailRes, householdsRes] = await Promise.all([
        api.get<UserDetail>(`/admin/users/${id}`),
        api.get<Household[]>('/admin/households'),
      ]);
      setDetail(detailRes.data);
      setAllHouseholds(householdsRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user.'));
    }
  }, [id]);

  useEffect(() => {
    if (!isAdmin || !id) return;
    (async () => {
      await load();
    })();
  }, [isAdmin, id, load]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text>You don&apos;t have access to this page.</Text>
      </ScreenContainer>
    );
  }

  if (!detail) {
    return (
      <ScreenContainer>
        {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : <Text>Loading…</Text>}
      </ScreenContainer>
    );
  }

  const addToHousehold = async () => {
    if (!newHouseholdId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/households/${newHouseholdId}/members`, { userId: id, role: newRole });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add house membership.'));
    } finally {
      setBusy(false);
    }
  };

  const removeFromHousehold = async (householdId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/households/${householdId}/members/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove house membership.'));
    } finally {
      setBusy(false);
    }
  };

  const joinedIds = new Set(detail.households.map((h) => h.householdId));
  const joinableHouseholds = allHouseholds.filter((h) => !joinedIds.has(h.id));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>{detail.displayName}</Text>
        <Text style={{ color: '#666' }}>{detail.email} · {detail.role}</Text>
        <Text style={{ color: '#666' }}>
          Verified: {detail.emailVerified ? 'Yes' : 'No'} · Joined {new Date(detail.createdAt).toLocaleDateString()}
        </Text>
        <Link href="/admin" style={{ color: '#2563eb' }}>
          ← Back to users
        </Link>
      </View>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Houses</Text>
        <TableContainer width={440}>
          <HeaderRow>
            <HeaderCell width={220}>House</HeaderCell>
            <HeaderCell width={110}>Role</HeaderCell>
            <HeaderCell width={110}>-</HeaderCell>
          </HeaderRow>
          {detail.households.map((h, index) => (
            <Row key={h.householdId} index={index}>
              <Cell width={220}>
                <Link href={`/admin/houses/${h.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                  {h.householdName}
                </Link>
              </Cell>
              <Cell width={110}><Text>{h.role}</Text></Cell>
              <Cell width={110}>
                <AdminActionButton label="Remove" variant="danger" onPress={() => removeFromHousehold(h.householdId)} disabled={busy} />
              </Cell>
            </Row>
          ))}
        </TableContainer>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Picker selectedValue={newHouseholdId} onValueChange={setNewHouseholdId} style={{ width: 220 }}>
            <Picker.Item label="Select a house…" value="" />
            {joinableHouseholds.map((h) => (
              <Picker.Item key={h.id} label={h.name} value={h.id} />
            ))}
          </Picker>
          <Picker selectedValue={newRole} onValueChange={setNewRole} style={{ width: 130 }}>
            {HOUSEHOLD_ROLES.map((r) => (
              <Picker.Item key={r} label={r} value={r} />
            ))}
          </Picker>
          <AdminActionButton label="Add to house" onPress={addToHousehold} disabled={busy || !newHouseholdId} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Assigned tasks</Text>
        <TableContainer width={340}>
          <HeaderRow>
            <HeaderCell width={220}>Title</HeaderCell>
            <HeaderCell width={60}>Done</HeaderCell>
            <HeaderCell width={60}>Due</HeaderCell>
          </HeaderRow>
          {detail.assignedTasks.map((t, index) => (
            <Row key={t.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{t.title}</Text></Cell>
              <Cell width={60}><Text>{t.done ? 'Yes' : 'No'}</Text></Cell>
              <Cell width={60}><Text>{t.dueDate ?? '-'}</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </View>
    </ScrollView>
  );
}
