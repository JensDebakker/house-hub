import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminSupply } from '@/types';

const COLS = {
  name: 200,
  household: 160,
  quantity: 90,
  expiryDate: 130,
  actions: 140,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

type Edits = { name: string; quantity: string; expiryDate: string };

export default function AdminSuppliesScreen() {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState<AdminSupply[]>([]);
  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get<AdminSupply[]>('/admin/supplies');
        setSupplies(data);
        setEdits(
          Object.fromEntries(
            data.map((s) => [s.id, { name: s.name, quantity: String(s.quantity), expiryDate: s.expiryDate }]),
          ),
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load supplies.'));
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

  const save = async (supplyId: string) => {
    const edit = edits[supplyId];
    setError(null);
    setBusyId(supplyId);
    try {
      const { data } = await api.patch<AdminSupply>(`/admin/supplies/${supplyId}`, {
        name: edit.name,
        quantity: Number(edit.quantity) || 0,
        expiryDate: edit.expiryDate,
      });
      setSupplies((prev) => prev.map((s) => (s.id === supplyId ? data : s)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update supply.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (supplyId: string) => {
    setError(null);
    setBusyId(supplyId);
    try {
      await api.delete(`/admin/supplies/${supplyId}`);
      setSupplies((prev) => prev.filter((s) => s.id !== supplyId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete supply.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Supplies</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.name}>Name</HeaderCell>
          <HeaderCell width={COLS.household}>House</HeaderCell>
          <HeaderCell width={COLS.quantity}>Qty</HeaderCell>
          <HeaderCell width={COLS.expiryDate}>Expiry</HeaderCell>
          <HeaderCell width={COLS.actions} />
        </HeaderRow>

        {supplies.map((s, index) => (
          <Row key={s.id} index={index}>
            <Cell width={COLS.name}>
              <TextInput
                value={edits[s.id]?.name ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], name: v } }))}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.household}>
              <Link href={`/admin/houses/${s.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {s.householdName}
              </Link>
            </Cell>
            <Cell width={COLS.quantity}>
              <TextInput
                value={edits[s.id]?.quantity ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], quantity: v } }))}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.expiryDate}>
              <TextInput
                value={edits[s.id]?.expiryDate ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], expiryDate: v } }))}
                placeholder="YYYY-MM-DD"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.actions}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => save(s.id)}
                  disabled={busyId === s.id}
                  style={[saveButtonStyle, { paddingHorizontal: 12, flex: undefined }]}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    {busyId === s.id ? '…' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => remove(s.id)} disabled={busyId === s.id}>
                  <Text style={{ color: '#c62828' }}>Delete</Text>
                </Pressable>
              </View>
            </Cell>
          </Row>
        ))}
      </TableContainer>
    </ScrollView>
  );
}
