import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import type { Supply } from '@/types';

const SUPPLIES_COLOR = '#0891b2';

let nextId = 1;
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
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');

  const addSupply = () => {
    if (!name.trim() || !expiryDate.trim()) return;
    setSupplies((prev) => [
      ...prev,
      { id: String(nextId++), name: name.trim(), quantity: Number(quantity) || 1, expiryDate },
    ]);
    setName('');
    setQuantity('1');
    setExpiryDate('');
  };

  const removeSupply = (id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <BigCardShell title="Medical Supplies" color={SUPPLIES_COLOR} scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        Long-press an item to remove it. Yellow = expiring within {WARNING_WINDOW_DAYS} days, red = expired.
      </Text>

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
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={supplies}
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
    </BigCardShell>
  );
}
