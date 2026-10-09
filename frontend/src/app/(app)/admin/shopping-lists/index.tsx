import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminShoppingList } from '@/types';

const COLS = {
  name: 220,
  household: 160,
  items: 160,
  actions: 140,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

export default function AdminShoppingListsScreen() {
  const { user } = useAuth();
  const [lists, setLists] = useState<AdminShoppingList[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get<AdminShoppingList[]>('/admin/shopping-lists');
        setLists(data);
        setEdits(Object.fromEntries(data.map((l) => [l.id, l.name])));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load shopping lists.'));
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

  const save = async (listId: string) => {
    setError(null);
    setBusyId(listId);
    try {
      const { data } = await api.patch<AdminShoppingList>(`/admin/shopping-lists/${listId}`, {
        name: edits[listId],
      });
      setLists((prev) => prev.map((l) => (l.id === listId ? data : l)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update shopping list.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (listId: string) => {
    setError(null);
    setBusyId(listId);
    try {
      await api.delete(`/admin/shopping-lists/${listId}`);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete shopping list.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Shopping Lists</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.name}>Name</HeaderCell>
          <HeaderCell width={COLS.household}>House</HeaderCell>
          <HeaderCell width={COLS.items}>Items</HeaderCell>
          <HeaderCell width={COLS.actions} />
        </HeaderRow>

        {lists.map((l, index) => {
          const checked = l.items.filter((i) => i.checked).length;
          return (
            <Row key={l.id} index={index}>
              <Cell width={COLS.name}>
                <TextInput
                  value={edits[l.id] ?? ''}
                  onChangeText={(v) => setEdits((prev) => ({ ...prev, [l.id]: v }))}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
                />
              </Cell>
              <Cell width={COLS.household}>
                <Link href={`/admin/houses/${l.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                  {l.householdName}
                </Link>
              </Cell>
              <Cell width={COLS.items}>
                <Text>{checked}/{l.items.length} checked</Text>
              </Cell>
              <Cell width={COLS.actions}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => save(l.id)}
                    disabled={busyId === l.id}
                    style={[saveButtonStyle, { paddingHorizontal: 12, flex: undefined }]}
                  >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                      {busyId === l.id ? '…' : 'Save'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => remove(l.id)} disabled={busyId === l.id}>
                    <Text style={{ color: '#c62828' }}>Delete</Text>
                  </Pressable>
                </View>
              </Cell>
            </Row>
          );
        })}
      </TableContainer>
    </ScrollView>
  );
}
