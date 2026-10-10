import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { dateKey, MonthGrid, parseDateKey } from '@/components/MonthGrid';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { useCalendarEventsQuery, useCreateCalendarEventMutation, useDeleteCalendarEventMutation } from '@/lib/useCalendarEvents';
import type { CalendarEvent } from '@/types';

const CALENDAR_COLOR = '#4f46e5';

/** First-of-month `Date` for the month currently shown in the grid - kept pinned to day 1 so
 * incrementing/decrementing the month never runs into day-overflow (e.g. Jan 31 + 1 month
 * landing on Mar 3 instead of Feb). */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  const calendarEventsQuery = useCalendarEventsQuery(householdId);
  const createEvent = useCreateCalendarEventMutation(householdId);
  const deleteEvent = useDeleteCalendarEventMutation(householdId);

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => today);

  const [title, setTitle] = useState('');
  const [dateInput, setDateInput] = useState(() => dateKey(today));

  // Adding an event should default to whichever day is currently selected, instead of
  // requiring the date to be retyped every time - but still lets it be edited before submit.
  // Set alongside `selectedDate` itself (rather than synced via an effect) so selecting a day
  // only ever triggers one render, not a cascading state-update-in-effect.
  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setDateInput(dateKey(date));
  };

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of calendarEventsQuery.data ?? []) {
      const key = dateKey(new Date(event.start));
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [calendarEventsQuery.data]);

  const selectedDayEvents = eventsByDay.get(dateKey(selectedDate)) ?? [];

  const changeMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setViewDate(startOfMonth(today));
    selectDay(today);
  };

  const addEvent = () => {
    if (!title.trim() || !dateInput.trim()) return;
    const startInstant = parseDateKey(dateInput).toISOString();
    createEvent.mutate({ title: title.trim(), start: startInstant });
    setTitle('');
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

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedDateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Module title="House Calendar" color={CALENDAR_COLOR} scroll={false}>
      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => changeMonth(-1)}
          style={{ padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: CALENDAR_COLOR }}>‹</Text>
        </Pressable>
        <Pressable onPress={goToToday} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{monthLabel}</Text>
          <Text style={{ fontSize: 11, color: CALENDAR_COLOR, fontWeight: '600' }}>Today</Text>
        </Pressable>
        <Pressable
          onPress={() => changeMonth(1)}
          style={{ padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: CALENDAR_COLOR }}>›</Text>
        </Pressable>
      </View>

      {calendarEventsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <>
          <MonthGrid
            year={viewDate.getFullYear()}
            month={viewDate.getMonth()}
            selectedDate={selectedDate}
            eventsByDay={eventsByDay}
            color={CALENDAR_COLOR}
            onSelectDay={selectDay}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              placeholder="Event title"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={addEvent}
              style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
            />
            <TextInput
              placeholder="YYYY-MM-DD"
              value={dateInput}
              onChangeText={setDateInput}
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

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
            {selectedDateLabel}
          </Text>

          {/* Last child, nothing rendered after it - same convention every other
              scroll={false} Module screen in this app follows (tasks/supplies/shopping),
              since a FlatList flex-growing among *trailing* siblings here can end up with an
              under-sized box whose overflow then gets painted over by whatever comes next. */}
          <FlatList
            data={selectedDayEvents}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 8 }}
            ListEmptyComponent={<Text style={{ color: '#999' }}>No events on this day.</Text>}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                }}
              >
                <Text style={{ flex: 1 }}>{item.title}</Text>
                <Pressable
                  onPress={() => removeEvent(item.id)}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ color: '#c62828', fontWeight: '700' }}>Remove</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}
    </Module>
  );
}
