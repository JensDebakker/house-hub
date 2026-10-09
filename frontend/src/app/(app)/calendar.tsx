import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { useCalendarEventsQuery, useCreateCalendarEventMutation, useDeleteCalendarEventMutation } from '@/lib/useCalendarEvents';

const CALENDAR_COLOR = '#4f46e5';

export default function CalendarScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  const calendarEventsQuery = useCalendarEventsQuery(householdId);
  const createEvent = useCreateCalendarEventMutation(householdId);
  const deleteEvent = useDeleteCalendarEventMutation(householdId);

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');

  const addEvent = () => {
    if (!title.trim() || !start.trim()) return;
    const startInstant = new Date(start).toISOString();
    createEvent.mutate({ title: title.trim(), start: startInstant });
    setTitle('');
    setStart('');
  };

  const removeEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

  const errorMessage = calendarEventsQuery.isError
    ? getErrorMessage(calendarEventsQuery.error, 'Failed to load calendar events.')
    : createEvent.isError
      ? getErrorMessage(createEvent.error, 'Failed to add event.')
      : deleteEvent.isError
        ? getErrorMessage(deleteEvent.error, 'Failed to remove event.')
        : null;

  const sortedEvents = [...(calendarEventsQuery.data ?? [])].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return (
    <BigCardShell title="House Calendar" color={CALENDAR_COLOR} scroll={false}>
      <Text style={{ color: '#666', fontSize: 13 }}>
        Simple upcoming-events list for now — a full calendar grid view can replace this later.
      </Text>

      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

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
          disabled={createEvent.isPending}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center', opacity: createEvent.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {calendarEventsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={sortedEvents}
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
              <Text style={{ color: '#555' }}>{new Date(item.start).toLocaleDateString()}</Text>
            </Pressable>
          )}
        />
      )}
    </BigCardShell>
  );
}
