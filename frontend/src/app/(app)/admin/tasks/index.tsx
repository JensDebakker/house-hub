import { Picker } from '@react-native-picker/picker';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminTask, AdminUser } from '@/types';

const COLS = {
  title: 220,
  household: 160,
  assignedTo: 170,
  dueDate: 130,
  done: 70,
  actions: 140,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

type Edits = {
  title: string;
  dueDate: string;
  assignedToId: string;
};

export default function AdminTasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          api.get<AdminTask[]>('/admin/tasks'),
          api.get<AdminUser[]>('/admin/users'),
        ]);
        setTasks(tasksRes.data);
        setUsers(usersRes.data);
        setEdits(
          Object.fromEntries(
            tasksRes.data.map((t) => [
              t.id,
              { title: t.title, dueDate: t.dueDate ?? '', assignedToId: t.assignedToId ?? '' },
            ]),
          ),
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load tasks.'));
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

  const save = async (taskId: string) => {
    const edit = edits[taskId];
    setError(null);
    setBusyId(taskId);
    try {
      const { data } = await api.patch<AdminTask>(`/admin/tasks/${taskId}`, {
        title: edit.title,
        dueDate: edit.dueDate || null,
        assignedToId: edit.assignedToId || undefined,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update task.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleDone = async (task: AdminTask) => {
    setError(null);
    setBusyId(task.id);
    try {
      const { data } = await api.patch<AdminTask>(`/admin/tasks/${task.id}`, { done: !task.done });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update task.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (taskId: string) => {
    setError(null);
    setBusyId(taskId);
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete task.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Tasks</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.title}>Title</HeaderCell>
          <HeaderCell width={COLS.household}>House</HeaderCell>
          <HeaderCell width={COLS.assignedTo}>Assigned to</HeaderCell>
          <HeaderCell width={COLS.dueDate}>Due</HeaderCell>
          <HeaderCell width={COLS.done}>Done</HeaderCell>
          <HeaderCell width={COLS.actions} />
        </HeaderRow>

        {tasks.map((t, index) => (
          <Row key={t.id} index={index}>
            <Cell width={COLS.title}>
              <TextInput
                value={edits[t.id]?.title ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], title: v } }))}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.household}>
              <Link href={`/admin/houses/${t.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {t.householdName}
              </Link>
            </Cell>
            <Cell width={COLS.assignedTo}>
              <Picker
                selectedValue={edits[t.id]?.assignedToId ?? ''}
                onValueChange={(v: string) =>
                  setEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], assignedToId: v } }))
                }
                style={{ width: COLS.assignedTo }}
              >
                <Picker.Item label="Unassigned" value="" />
                {users.map((u) => (
                  <Picker.Item key={u.id} label={u.displayName} value={u.id} />
                ))}
              </Picker>
            </Cell>
            <Cell width={COLS.dueDate}>
              <TextInput
                value={edits[t.id]?.dueDate ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], dueDate: v } }))}
                placeholder="YYYY-MM-DD"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.done}>
              <Pressable onPress={() => toggleDone(t)} disabled={busyId === t.id}>
                <Text style={{ color: t.done ? '#2e7d32' : '#c62828' }}>{t.done ? 'Yes' : 'No'}</Text>
              </Pressable>
            </Cell>
            <Cell width={COLS.actions}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => save(t.id)}
                  disabled={busyId === t.id}
                  style={[saveButtonStyle, { paddingHorizontal: 12, flex: undefined }]}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    {busyId === t.id ? '…' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => remove(t.id)} disabled={busyId === t.id}>
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
