import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import type { ShoppingListItem } from '@/types';

const SHOPPING_COLOR = '#059669';

let nextId = 1;

export default function ShoppingScreen() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [label, setLabel] = useState('');

  const addItem = () => {
    if (!label.trim()) return;
    setItems((prev) => [...prev, { id: String(nextId++), label: label.trim(), checked: false }]);
    setLabel('');
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <BigCardShell title="Shopping List" color={SHOPPING_COLOR} scroll={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Add an item…"
          value={label}
          onChangeText={setLabel}
          onSubmitEditing={addItem}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={addItem}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingTop: 8 }}
        ListEmptyComponent={<Text style={{ color: '#999' }}>List is empty.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggleItem(item.id)}
            onLongPress={() => removeItem(item.id)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 8,
              backgroundColor: item.checked ? '#ecfdf5' : '#f3f4f6',
            }}
          >
            <Text style={{ textDecorationLine: item.checked ? 'line-through' : 'none' }}>
              {item.label}
            </Text>
            <Text style={{ color: '#999' }}>{item.checked ? '✓' : ''}</Text>
          </Pressable>
        )}
      />
    </BigCardShell>
  );
}
