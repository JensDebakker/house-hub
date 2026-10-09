import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { useCreateTaskMutation, useDeleteTaskMutation, useTasksQuery, useUpdateTaskMutation } from '@/lib/useTasks';
import type { Task } from '@/types';

const TASKS_COLOR = '#dc2626';

export default function TasksScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  const tasksQuery = useTasksQuery(householdId);
  const createTask = useCreateTaskMutation(householdId);
  const updateTask = useUpdateTaskMutation(householdId);
  const deleteTask = useDeleteTaskMutation(householdId);

  const [title, setTitle] = useState('');

  const addTask = () => {
    if (!title.trim()) return;
    createTask.mutate({ title: title.trim(), done: false });
    setTitle('');
  };

  const toggleTask = (task: Task) => {
    updateTask.mutate({
      id: task.id,
      request: { title: task.title, done: !task.done, assignedTo: task.assignedTo, dueDate: task.dueDate },
    });
  };

  const removeTask = (id: string) => {
    deleteTask.mutate(id);
  };

  const errorMessage = tasksQuery.isError
    ? getErrorMessage(tasksQuery.error, 'Failed to load tasks.')
    : createTask.isError
      ? getErrorMessage(createTask.error, 'Failed to add task.')
      : updateTask.isError
        ? getErrorMessage(updateTask.error, 'Failed to update task.')
        : deleteTask.isError
          ? getErrorMessage(deleteTask.error, 'Failed to remove task.')
          : null;

  return (
    <BigCardShell title="Routine Tasks" color={TASKS_COLOR} scroll={false}>
      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

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
          disabled={createTask.isPending}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center', opacity: createTask.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {tasksQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={tasksQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingTop: 8 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>No tasks yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggleTask(item)}
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
      )}
    </BigCardShell>
  );
}
