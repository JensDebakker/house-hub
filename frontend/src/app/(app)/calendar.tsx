import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import type { CalendarEvent } from '@/types';

let nextId = 1;

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');

  const addEvent = () => {
    if (!title.trim() || !start.trim()) return;
    const next = [...events, { id: String(nextId++), title: title.trim(), start }];
    next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    setEvents(next);
    setTitle('');
    setStart('');
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <BigCardShell title="Household Calendar" scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        Simple upcoming-events list for now — a full calendar grid view can replace this later.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Event title"
          value={title}
          onChangeText={setTitle}
          style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <TextInput
          placeholder="YYYY-MM-DD"
          value={start}
          onChangeText={setStart}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={addEvent}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingTop: 8 }}
        ListEmptyComponent={<Text style={{ color: '#999' }}>No events yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => removeEvent(item.id)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#f3f4f6',
            }}
          >
            <Text>{item.title}</Text>
            <Text style={{ color: '#555' }}>{item.start}</Text>
          </Pressable>
        )}
      />
    </BigCardShell>
  );
}
