import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Module } from '@/components/Module';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { useCreateTaskMutation, useDeleteTaskMutation, useTasksQuery, useUpdateTaskMutation } from '@/lib/useTasks';
import type { Task } from '@/types';

const TASKS_COLOR = '#dc2626';

export default function TasksScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { t } = useTranslation();

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
    ? getErrorMessage(tasksQuery.error, t('house.tasks.loadFailed'))
    : createTask.isError
      ? getErrorMessage(createTask.error, t('house.tasks.addFailed'))
      : updateTask.isError
        ? getErrorMessage(updateTask.error, t('house.tasks.updateFailed'))
        : deleteTask.isError
          ? getErrorMessage(deleteTask.error, t('house.tasks.removeFailed'))
          : null;

  return (
    <Module title={t('house.tasks.title')} color={TASKS_COLOR} scroll={false}>
      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder={t('house.tasks.placeholder')}
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
          <Text style={{ color: 'white', fontWeight: '600' }}>{t('common.add')}</Text>
        </Pressable>
      </View>

      {tasksQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={tasksQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingTop: 8 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>{t('house.tasks.empty')}</Text>}
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
    </Module>
  );
}
