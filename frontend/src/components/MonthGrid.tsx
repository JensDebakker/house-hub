import { Pressable, Text, View } from 'react-native';
import { pastelize } from '@/lib/color';
import type { CalendarEvent } from '@/types';

/** Formats a Date as a `YYYY-MM-DD` key using its *local* calendar fields (not UTC), so a
 * day bucket matches what the user sees on the grid regardless of their timezone offset
 * relative to the event's stored UTC instant. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a `YYYY-MM-DD` key as local midnight (the `dateKey` inverse) rather than via the
 * `Date` constructor's own date-only-string parsing, which treats it as UTC midnight and
 * shifts the day by one for anyone west of UTC. Falls back to the built-in parser for any
 * other format, since the date field this feeds is free text, not restricted to this shape. */
export function parseDateKey(value: string): Date {
  const match = value.match(DATE_KEY_PATTERN);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// A known Sunday (2023-01-01) used purely to read locale-appropriate short weekday labels
// in Sun..Sat order, without hardcoding English names.
const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) =>
  new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
);

/**
 * Builds the full set of grid cells for a given month, including the leading/trailing days
 * from the adjacent months needed to fill out complete weeks. Relies on the `Date`
 * constructor's own day-overflow/underflow handling (e.g. day `0` rolls back into the
 * previous month) to get month/year rollovers and varying month lengths right without any
 * special-casing - this also handles leap years for free, since `new Date(year, month + 1,
 * 0).getDate()` already returns 29 for a leap February.
 */
export function getMonthGridDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + firstWeekday) / 7) * 7;

  const days: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    days.push(new Date(year, month, 1 - firstWeekday + i));
  }
  return days;
}

const MAX_TITLE_PREVIEWS = 2;

function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isSelected,
  events,
  color,
  onSelect,
}: {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  color: string;
  onSelect: (date: Date) => void;
}) {
  const extraCount = events.length - MAX_TITLE_PREVIEWS;

  return (
    <Pressable
      onPress={() => onSelect(date)}
      style={{
        flex: 1,
        margin: 2,
        minHeight: 54,
        borderRadius: 8,
        padding: 4,
        backgroundColor: isSelected ? color : isToday ? pastelize(color, 0.7) : inCurrentMonth ? '#f9fafb' : 'transparent',
        borderWidth: isToday && !isSelected ? 2 : 0,
        borderColor: color,
        opacity: inCurrentMonth ? 1 : 0.4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: isToday || isSelected ? '700' : '500',
          color: isSelected ? 'white' : inCurrentMonth ? '#111827' : '#9ca3af',
        }}
      >
        {date.getDate()}
      </Text>
      {events.slice(0, MAX_TITLE_PREVIEWS).map((event) => (
        <Text
          key={event.id}
          numberOfLines={1}
          style={{
            fontSize: 10,
            marginTop: 1,
            color: isSelected ? 'white' : '#4b5563',
          }}
        >
          • {event.title}
        </Text>
      ))}
      {extraCount > 0 ? (
        <Text style={{ fontSize: 10, marginTop: 1, color: isSelected ? 'white' : '#6b7280' }}>
          +{extraCount} more
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  eventsByDay,
  color,
  onSelectDay,
}: {
  year: number;
  /** 0-indexed, same convention as `Date#getMonth`. */
  month: number;
  selectedDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  color: string;
  onSelectDay: (date: Date) => void;
}) {
  const days = getMonthGridDays(year, month);
  const today = new Date();

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280' }}>{label}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].toISOString()} style={{ flexDirection: 'row' }}>
          {week.map((date) => (
            <DayCell
              key={date.toISOString()}
              date={date}
              inCurrentMonth={date.getMonth() === month}
              isToday={isSameDay(date, today)}
              isSelected={isSameDay(date, selectedDate)}
              events={eventsByDay.get(dateKey(date)) ?? []}
              color={color}
              onSelect={onSelectDay}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
