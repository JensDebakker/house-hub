import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AdminActionButton, Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { BigCardShell } from '@/components/BigCardShell';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type {
  AdminCalendarEvent,
  AdminShoppingList,
  AdminSupply,
  AdminTask,
  AdminUser,
  CalendarEvent,
  Household,
  HouseFile,
  HouseholdDetail,
  HouseholdRole,
  ShoppingList,
  Supply,
  Task,
} from '@/types';

const HOUSES_COLOR = '#0f766e';
const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

const DATABASE_TABS = ['Members', 'Tasks', 'Supplies', 'Shopping Lists', 'Calendar', 'Files'] as const;
type DatabaseTab = (typeof DATABASE_TABS)[number];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

// The /admin/{tasks,supplies,...} mutation endpoints return the Admin*Response shape
// (which carries householdId/householdName for the now-removed flat admin tables).
// These map that back onto the plain shape `detail` holds, so a save/delete can merge
// the single changed row into local state instead of re-fetching the whole household
// (which would wipe any other row's unsaved edit-in-progress).
function fromAdminTask(t: AdminTask): Task {
  return { id: t.id, title: t.title, done: t.done, assignedTo: t.assignedToId, dueDate: t.dueDate };
}

function fromAdminSupply(s: AdminSupply): Supply {
  return { id: s.id, name: s.name, quantity: s.quantity, expiryDate: s.expiryDate };
}

function fromAdminShoppingList(l: AdminShoppingList): ShoppingList {
  return { id: l.id, name: l.name, items: l.items };
}

function fromAdminCalendarEvent(e: AdminCalendarEvent): CalendarEvent {
  return { id: e.id, title: e.title, start: e.start, end: e.end };
}

/** Pill tabs for switching between a house's "databases" (members/tasks/supplies/…)
 * inside the detail card - local state, not routed, since they're all views over the
 * one already-loaded HouseholdDetail payload rather than separate screens. */
function DatabaseTabBar({ active, onChange }: { active: DatabaseTab; onChange: (tab: DatabaseTab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {DATABASE_TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: isActive ? HOUSES_COLOR : 'white',
              borderWidth: 1,
              borderColor: HOUSES_COLOR,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? 'white' : HOUSES_COLOR }}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function AdminHouseDetailScreen() {
  const isAdmin = useRequireAdmin();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DatabaseTab>('Members');

  const [limitGb, setLimitGb] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<HouseholdRole>('MEMBER');
  const [busy, setBusy] = useState(false);

  const [taskEdits, setTaskEdits] = useState<Record<string, { title: string; dueDate: string; assignedToId: string }>>({});
  const [supplyEdits, setSupplyEdits] = useState<Record<string, { name: string; quantity: string; expiryDate: string }>>({});
  const [shoppingEdits, setShoppingEdits] = useState<Record<string, string>>({});
  const [calendarEdits, setCalendarEdits] = useState<Record<string, { title: string; start: string; end: string }>>({});
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detailRes, usersRes] = await Promise.all([
        api.get<HouseholdDetail>(`/admin/households/${id}`),
        api.get<AdminUser[]>('/admin/users'),
      ]);
      setDetail(detailRes.data);
      setAllUsers(usersRes.data);
      setLimitGb((detailRes.data.household.storageLimitBytes / 1024 ** 3).toString());
      setTaskEdits(
        Object.fromEntries(
          detailRes.data.tasks.map((t) => [t.id, { title: t.title, dueDate: t.dueDate ?? '', assignedToId: t.assignedTo ?? '' }]),
        ),
      );
      setSupplyEdits(
        Object.fromEntries(
          detailRes.data.supplies.map((s) => [s.id, { name: s.name, quantity: String(s.quantity), expiryDate: s.expiryDate }]),
        ),
      );
      setShoppingEdits(Object.fromEntries(detailRes.data.shoppingLists.map((l) => [l.id, l.name])));
      setCalendarEdits(
        Object.fromEntries(
          detailRes.data.calendarEvents.map((e) => [e.id, { title: e.title, start: toLocalInput(e.start), end: toLocalInput(e.end) }]),
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load house.'));
    }
  }, [id]);

  useEffect(() => {
    if (!isAdmin || !id) return;
    (async () => {
      await load();
    })();
  }, [isAdmin, id, load]);

  if (!isAdmin) {
    return (
      <BigCardShell title="House" color={HOUSES_COLOR}>
        <Text>You don&apos;t have access to this page.</Text>
      </BigCardShell>
    );
  }

  if (!detail) {
    return (
      <BigCardShell title="House" color={HOUSES_COLOR}>
        {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : <Text>Loading…</Text>}
      </BigCardShell>
    );
  }

  const { household, members, tasks, supplies, shoppingLists, calendarEvents, files } = detail;

  const saveLimit = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = Math.round(parseFloat(limitGb || '0') * 1024 ** 3);
      const { data } = await api.patch<Household>(`/admin/households/${id}`, { storageLimitBytes: bytes });
      setDetail((prev) => prev && { ...prev, household: data });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update storage limit.'));
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!newMemberId) return;
    const user = allUsers.find((u) => u.id === newMemberId);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/households/${id}/members`, { userId: newMemberId, role: newMemberRole });
      if (user) {
        setDetail((prev) => prev && {
          ...prev,
          members: [...prev.members, { userId: user.id, displayName: user.displayName, email: user.email, role: newMemberRole }],
        });
      }
      setNewMemberId('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add member.'));
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/households/${id}/members/${userId}`);
      setDetail((prev) => prev && { ...prev, members: prev.members.filter((m) => m.userId !== userId) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member.'));
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        formData.append('file', blob, asset.name);
      } else {
        formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);
      }
      const { data } = await api.post<HouseFile>(`/households/${id}/files`, formData);
      setDetail((prev) => prev && {
        ...prev,
        files: [...prev.files, data],
        household: { ...prev.household, storageUsedBytes: prev.household.storageUsedBytes + data.sizeBytes, fileCount: prev.household.fileCount + 1 },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload file.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/households/${id}/files/${fileId}`);
      setDetail((prev) => {
        if (!prev) return prev;
        const removed = prev.files.find((f) => f.id === fileId);
        return {
          ...prev,
          files: prev.files.filter((f) => f.id !== fileId),
          household: removed
            ? { ...prev.household, storageUsedBytes: prev.household.storageUsedBytes - removed.sizeBytes, fileCount: prev.household.fileCount - 1 }
            : prev.household,
        };
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete file.'));
    } finally {
      setBusy(false);
    }
  };

  const saveTask = async (taskId: string) => {
    const edit = taskEdits[taskId];
    setError(null);
    setRowBusyId(taskId);
    try {
      const { data } = await api.patch<AdminTask>(`/admin/tasks/${taskId}`, {
        title: edit.title,
        dueDate: edit.dueDate || null,
        assignedToId: edit.assignedToId || undefined,
      });
      setDetail((prev) => prev && { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? fromAdminTask(data) : t)) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update task.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const toggleTaskDone = async (taskId: string, done: boolean) => {
    setError(null);
    setRowBusyId(taskId);
    try {
      const { data } = await api.patch<AdminTask>(`/admin/tasks/${taskId}`, { done: !done });
      setDetail((prev) => prev && { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? fromAdminTask(data) : t)) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update task.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    setError(null);
    setRowBusyId(taskId);
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      setDetail((prev) => prev && { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete task.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const saveSupply = async (supplyId: string) => {
    const edit = supplyEdits[supplyId];
    setError(null);
    setRowBusyId(supplyId);
    try {
      const { data } = await api.patch<AdminSupply>(`/admin/supplies/${supplyId}`, {
        name: edit.name,
        quantity: Number(edit.quantity) || 0,
        expiryDate: edit.expiryDate,
      });
      setDetail((prev) => prev && { ...prev, supplies: prev.supplies.map((s) => (s.id === supplyId ? fromAdminSupply(data) : s)) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update supply.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteSupply = async (supplyId: string) => {
    setError(null);
    setRowBusyId(supplyId);
    try {
      await api.delete(`/admin/supplies/${supplyId}`);
      setDetail((prev) => prev && { ...prev, supplies: prev.supplies.filter((s) => s.id !== supplyId) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete supply.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const saveShoppingList = async (listId: string) => {
    setError(null);
    setRowBusyId(listId);
    try {
      const { data } = await api.patch<AdminShoppingList>(`/admin/shopping-lists/${listId}`, { name: shoppingEdits[listId] });
      setDetail((prev) => prev && { ...prev, shoppingLists: prev.shoppingLists.map((l) => (l.id === listId ? fromAdminShoppingList(data) : l)) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update shopping list.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteShoppingList = async (listId: string) => {
    setError(null);
    setRowBusyId(listId);
    try {
      await api.delete(`/admin/shopping-lists/${listId}`);
      setDetail((prev) => prev && { ...prev, shoppingLists: prev.shoppingLists.filter((l) => l.id !== listId) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete shopping list.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const saveCalendarEvent = async (eventId: string) => {
    const edit = calendarEdits[eventId];
    setError(null);
    setRowBusyId(eventId);
    try {
      const { data } = await api.patch<AdminCalendarEvent>(`/admin/calendar-events/${eventId}`, {
        title: edit.title,
        start: edit.start ? new Date(edit.start).toISOString() : undefined,
        end: edit.end ? new Date(edit.end).toISOString() : undefined,
      });
      setDetail((prev) => prev && { ...prev, calendarEvents: prev.calendarEvents.map((e) => (e.id === eventId ? fromAdminCalendarEvent(data) : e)) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update event.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    setError(null);
    setRowBusyId(eventId);
    try {
      await api.delete(`/admin/calendar-events/${eventId}`);
      setDetail((prev) => prev && { ...prev, calendarEvents: prev.calendarEvents.filter((e) => e.id !== eventId) });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete event.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const addableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  return (
    <BigCardShell title={household.name} color={HOUSES_COLOR}>
      <View>
        <Text style={{ color: '#666' }}>Invite code: {household.inviteCode}</Text>
        <Link href="/admin/houses" style={{ color: '#2563eb' }}>
          ← Back to houses
        </Link>
      </View>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text>Storage limit (GB):</Text>
        <TextInput
          value={limitGb}
          onChangeText={setLimitGb}
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, width: 80, backgroundColor: 'white' }}
        />
        <AdminActionButton label="Save" onPress={saveLimit} disabled={busy} />
        <Text style={{ color: '#666' }}>
          Used: {formatBytes(household.storageUsedBytes)} / {formatBytes(household.storageLimitBytes)}
        </Text>
      </View>

      <DatabaseTabBar
        active={tab}
        onChange={(next) => {
          setTab(next);
          // Clears any error left over from the previous tab's last action, so it doesn't
          // keep showing above an unrelated table the admin just switched to.
          setError(null);
        }}
      />

      {tab === 'Members' ? (
        <View style={{ gap: 8 }}>
          <TableContainer width={430}>
            <HeaderRow>
              <HeaderCell width={180}>Name</HeaderCell>
              <HeaderCell width={110}>Role</HeaderCell>
              <HeaderCell width={140}>-</HeaderCell>
            </HeaderRow>
            {members.map((m, index) => (
              <Row key={m.userId} index={index}>
                <Cell width={180}>
                  <Link href={`/admin/users/${m.userId}`} style={{ color: '#2563eb' }}>{m.displayName}</Link>
                </Cell>
                <Cell width={110}><Text>{m.role}</Text></Cell>
                <Cell width={140}>
                  <AdminActionButton label="Remove" variant="danger" onPress={() => removeMember(m.userId)} disabled={busy} />
                </Cell>
              </Row>
            ))}
          </TableContainer>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Picker selectedValue={newMemberId} onValueChange={setNewMemberId} style={{ width: 220 }}>
              <Picker.Item label="Select a user…" value="" />
              {addableUsers.map((u) => (
                <Picker.Item key={u.id} label={`${u.displayName} (${u.email})`} value={u.id} />
              ))}
            </Picker>
            <Picker selectedValue={newMemberRole} onValueChange={setNewMemberRole} style={{ width: 130 }}>
              {HOUSEHOLD_ROLES.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>
            <AdminActionButton label="Add member" onPress={addMember} disabled={busy || !newMemberId} />
          </View>
        </View>
      ) : null}

      {tab === 'Tasks' ? (
        <TableContainer width={660}>
          <HeaderRow>
            <HeaderCell width={200}>Title</HeaderCell>
            <HeaderCell width={170}>Assigned to</HeaderCell>
            <HeaderCell width={130}>Due</HeaderCell>
            <HeaderCell width={70}>Done</HeaderCell>
            <HeaderCell width={90} />
          </HeaderRow>
          {tasks.map((t, index) => (
            <Row key={t.id} index={index}>
              <Cell width={200}>
                <TextInput
                  value={taskEdits[t.id]?.title ?? ''}
                  onChangeText={(v) => setTaskEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], title: v } }))}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={170}>
                <Picker
                  selectedValue={taskEdits[t.id]?.assignedToId ?? ''}
                  onValueChange={(v: string) =>
                    setTaskEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], assignedToId: v } }))
                  }
                  style={{ width: 170 }}
                >
                  <Picker.Item label="Unassigned" value="" />
                  {members.map((m) => (
                    <Picker.Item key={m.userId} label={m.displayName} value={m.userId} />
                  ))}
                </Picker>
              </Cell>
              <Cell width={130}>
                <TextInput
                  value={taskEdits[t.id]?.dueDate ?? ''}
                  onChangeText={(v) => setTaskEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], dueDate: v } }))}
                  placeholder="YYYY-MM-DD"
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={70}>
                <Pressable onPress={() => toggleTaskDone(t.id, t.done)} disabled={rowBusyId === t.id}>
                  <Text style={{ color: t.done ? '#2e7d32' : '#c62828' }}>{t.done ? 'Yes' : 'No'}</Text>
                </Pressable>
              </Cell>
              <Cell width={90}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AdminActionButton label="Save" onPress={() => saveTask(t.id)} busy={rowBusyId === t.id} small />
                  <AdminActionButton label="Delete" variant="danger" onPress={() => deleteTask(t.id)} disabled={rowBusyId === t.id} small />
                </View>
              </Cell>
            </Row>
          ))}
        </TableContainer>
      ) : null}

      {tab === 'Supplies' ? (
        <TableContainer width={560}>
          <HeaderRow>
            <HeaderCell width={220}>Name</HeaderCell>
            <HeaderCell width={80}>Qty</HeaderCell>
            <HeaderCell width={120}>Expiry</HeaderCell>
            <HeaderCell width={140} />
          </HeaderRow>
          {supplies.map((s, index) => (
            <Row key={s.id} index={index}>
              <Cell width={220}>
                <TextInput
                  value={supplyEdits[s.id]?.name ?? ''}
                  onChangeText={(v) => setSupplyEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], name: v } }))}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={80}>
                <TextInput
                  value={supplyEdits[s.id]?.quantity ?? ''}
                  onChangeText={(v) => setSupplyEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], quantity: v } }))}
                  keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={120}>
                <TextInput
                  value={supplyEdits[s.id]?.expiryDate ?? ''}
                  onChangeText={(v) => setSupplyEdits((prev) => ({ ...prev, [s.id]: { ...prev[s.id], expiryDate: v } }))}
                  placeholder="YYYY-MM-DD"
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={140}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AdminActionButton label="Save" onPress={() => saveSupply(s.id)} busy={rowBusyId === s.id} small />
                  <AdminActionButton label="Delete" variant="danger" onPress={() => deleteSupply(s.id)} disabled={rowBusyId === s.id} small />
                </View>
              </Cell>
            </Row>
          ))}
        </TableContainer>
      ) : null}

      {tab === 'Shopping Lists' ? (
        <TableContainer width={520}>
          <HeaderRow>
            <HeaderCell width={220}>Name</HeaderCell>
            <HeaderCell width={160}>Items</HeaderCell>
            <HeaderCell width={140} />
          </HeaderRow>
          {shoppingLists.map((l, index) => {
            const checked = l.items.filter((i) => i.checked).length;
            return (
              <Row key={l.id} index={index}>
                <Cell width={220}>
                  <TextInput
                    value={shoppingEdits[l.id] ?? ''}
                    onChangeText={(v) => setShoppingEdits((prev) => ({ ...prev, [l.id]: v }))}
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                  />
                </Cell>
                <Cell width={160}>
                  <Text>{checked}/{l.items.length} checked</Text>
                </Cell>
                <Cell width={140}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <AdminActionButton label="Save" onPress={() => saveShoppingList(l.id)} busy={rowBusyId === l.id} small />
                    <AdminActionButton label="Delete" variant="danger" onPress={() => deleteShoppingList(l.id)} disabled={rowBusyId === l.id} small />
                  </View>
                </Cell>
              </Row>
            );
          })}
        </TableContainer>
      ) : null}

      {tab === 'Calendar' ? (
        <TableContainer width={660}>
          <HeaderRow>
            <HeaderCell width={180}>Title</HeaderCell>
            <HeaderCell width={170}>Start</HeaderCell>
            <HeaderCell width={170}>End</HeaderCell>
            <HeaderCell width={140} />
          </HeaderRow>
          {calendarEvents.map((e, index) => (
            <Row key={e.id} index={index}>
              <Cell width={180}>
                <TextInput
                  value={calendarEdits[e.id]?.title ?? ''}
                  onChangeText={(v) => setCalendarEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], title: v } }))}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={170}>
                <TextInput
                  value={calendarEdits[e.id]?.start ?? ''}
                  onChangeText={(v) => setCalendarEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], start: v } }))}
                  placeholder="YYYY-MM-DDTHH:mm"
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={170}>
                <TextInput
                  value={calendarEdits[e.id]?.end ?? ''}
                  onChangeText={(v) => setCalendarEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], end: v } }))}
                  placeholder="YYYY-MM-DDTHH:mm"
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, backgroundColor: 'white' }}
                />
              </Cell>
              <Cell width={140}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AdminActionButton label="Save" onPress={() => saveCalendarEvent(e.id)} busy={rowBusyId === e.id} small />
                  <AdminActionButton label="Delete" variant="danger" onPress={() => deleteCalendarEvent(e.id)} disabled={rowBusyId === e.id} small />
                </View>
              </Cell>
            </Row>
          ))}
        </TableContainer>
      ) : null}

      {tab === 'Files' ? (
        <View style={{ gap: 8 }}>
          <TableContainer width={520}>
            <HeaderRow>
              <HeaderCell width={200}>Filename</HeaderCell>
              <HeaderCell width={80}>Size</HeaderCell>
              <HeaderCell width={120}>Uploaded by</HeaderCell>
              <HeaderCell width={120} />
            </HeaderRow>
            {files.map((f, index) => (
              <Row key={f.id} index={index}>
                <Cell width={200}><Text numberOfLines={1}>{f.filename}</Text></Cell>
                <Cell width={80}><Text>{formatBytes(f.sizeBytes)}</Text></Cell>
                <Cell width={120}><Text numberOfLines={1}>{f.uploadedByName ?? '-'}</Text></Cell>
                <Cell width={120}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <AdminActionButton label="Download" variant="link" onPress={() => downloadFile(id, f.id, f.filename)} />
                    <AdminActionButton label="Delete" variant="danger" onPress={() => deleteFile(f.id)} disabled={busy} />
                  </View>
                </Cell>
              </Row>
            ))}
          </TableContainer>
          <AdminActionButton
            label="Upload file"
            onPress={uploadFile}
            disabled={busy}
            style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 16 }}
          />
        </View>
      ) : null}
    </BigCardShell>
  );
}

async function downloadFile(householdId: string | undefined, fileId: string, filename: string) {
  const { data } = await api.get(`/households/${householdId}/files/${fileId}`, { responseType: 'blob' });
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
