import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { useCreateSupplyMutation, useDeleteSupplyMutation, useSuppliesQuery } from '@/lib/useSupplies';

const SUPPLIES_COLOR = '#0891b2';

const WARNING_WINDOW_DAYS = 7;

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function statusColor(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return '#fee2e2'; // expired
  if (days <= WARNING_WINDOW_DAYS) return '#fef3c7'; // expiring soon
  return '#f3f4f6';
}

export default function SuppliesScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  const suppliesQuery = useSuppliesQuery(householdId);
  const createSupply = useCreateSupplyMutation(householdId);
  const deleteSupply = useDeleteSupplyMutation(householdId);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');

  const addSupply = () => {
    if (!name.trim() || !expiryDate.trim()) return;
    createSupply.mutate({ name: name.trim(), quantity: Number(quantity) || 1, expiryDate });
    setName('');
    setQuantity('1');
    setExpiryDate('');
  };

  const removeSupply = (id: string) => {
    deleteSupply.mutate(id);
  };

  const errorMessage = suppliesQuery.isError
    ? getErrorMessage(suppliesQuery.error, 'Failed to load supplies.')
    : createSupply.isError
      ? getErrorMessage(createSupply.error, 'Failed to add supply.')
      : deleteSupply.isError
        ? getErrorMessage(deleteSupply.error, 'Failed to remove supply.')
        : null;

  return (
    <BigCardShell title="Medical Supplies" color={SUPPLIES_COLOR} scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        Long-press an item to remove it. Yellow = expiring within {WARNING_WINDOW_DAYS} days, red = expired.
      </Text>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <TextInput
          placeholder="Qty"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Expiry date (YYYY-MM-DD)"
          value={expiryDate}
          onChangeText={setExpiryDate}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={addSupply}
          disabled={createSupply.isPending}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center', opacity: createSupply.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {suppliesQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={suppliesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingTop: 8 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>No supplies tracked yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => removeSupply(item.id)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 8,
                backgroundColor: statusColor(item.expiryDate),
              }}
            >
              <Text>
                {item.name} × {item.quantity}
              </Text>
              <Text style={{ color: '#555' }}>{item.expiryDate}</Text>
            </Pressable>
          )}
        />
      )}
    </BigCardShell>
  );
}
