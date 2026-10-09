import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import type { Task } from '@/types';

const TASKS_COLOR = '#dc2626';

let nextId = 1;

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  const addTask = () => {
    if (!title.trim()) return;
    setTasks((prev) => [...prev, { id: String(nextId++), title: title.trim(), done: false }]);
    setTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <BigCardShell title="Routine Tasks" color={TASKS_COLOR} scroll={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Add a task…"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={addTask}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={addTask}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingTop: 8 }}
        ListEmptyComponent={<Text style={{ color: '#999' }}>No tasks yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggleTask(item.id)}
            onLongPress={() => removeTask(item.id)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 8,
              backgroundColor: item.done ? '#ecfdf5' : '#f3f4f6',
            }}
          >
            <Text style={{ textDecorationLine: item.done ? 'line-through' : 'none' }}>
              {item.title}
            </Text>
            <Text style={{ color: '#999' }}>{item.done ? '✓' : ''}</Text>
          </Pressable>
        )}
      />
    </BigCardShell>
  );
}
