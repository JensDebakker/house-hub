import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { AdminCalendarEvent } from '@/types';

const COLS = {
  title: 200,
  household: 160,
  start: 180,
  end: 180,
  actions: 140,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

type Edits = { title: string; start: string; end: string };

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  // yyyy-MM-ddTHH:mm, trimmed from the ISO instant, for a <input type=datetime-local>-style field
  return iso.slice(0, 16);
}

export default function AdminCalendarEventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get<AdminCalendarEvent[]>('/admin/calendar-events');
        setEvents(data);
        setEdits(
          Object.fromEntries(
            data.map((e) => [e.id, { title: e.title, start: toLocalInput(e.start), end: toLocalInput(e.end) }]),
          ),
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load calendar events.'));
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

  const save = async (eventId: string) => {
    const edit = edits[eventId];
    setError(null);
    setBusyId(eventId);
    try {
      const { data } = await api.patch<AdminCalendarEvent>(`/admin/calendar-events/${eventId}`, {
        title: edit.title,
        start: edit.start ? new Date(edit.start).toISOString() : undefined,
        end: edit.end ? new Date(edit.end).toISOString() : undefined,
      });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? data : e)));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update event.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (eventId: string) => {
    setError(null);
    setBusyId(eventId);
    try {
      await api.delete(`/admin/calendar-events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete event.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Calendar Events</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.title}>Title</HeaderCell>
          <HeaderCell width={COLS.household}>House</HeaderCell>
          <HeaderCell width={COLS.start}>Start</HeaderCell>
          <HeaderCell width={COLS.end}>End</HeaderCell>
          <HeaderCell width={COLS.actions} />
        </HeaderRow>

        {events.map((e, index) => (
          <Row key={e.id} index={index}>
            <Cell width={COLS.title}>
              <TextInput
                value={edits[e.id]?.title ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], title: v } }))}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.household}>
              <Link href={`/admin/houses/${e.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {e.householdName}
              </Link>
            </Cell>
            <Cell width={COLS.start}>
              <TextInput
                value={edits[e.id]?.start ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], start: v } }))}
                placeholder="YYYY-MM-DDTHH:mm"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.end}>
              <TextInput
                value={edits[e.id]?.end ?? ''}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [e.id]: { ...prev[e.id], end: v } }))}
                placeholder="YYYY-MM-DDTHH:mm"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6 }}
              />
            </Cell>
            <Cell width={COLS.actions}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => save(e.id)}
                  disabled={busyId === e.id}
                  style={[saveButtonStyle, { paddingHorizontal: 12 }]}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    {busyId === e.id ? '…' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => remove(e.id)} disabled={busyId === e.id}>
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
