import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/i18n';
import type { CalendarEvent } from '@/types';
import { DayCell } from './DayCell';
import { dateKey } from './dateKey';
import { getMonthGridDays } from './getMonthGridDays';
import { isSameDay } from './isSameDay';

export { dateKey, isSameDay, getMonthGridDays };
export { parseDateKey } from './parseDateKey';

// A known Sunday (2023-01-01) used purely to read locale-appropriate short weekday labels
// in Sun..Sat order, without hardcoding English names. Local to this file only (unlike the
// extracted date helpers above), so it stays inline rather than its own file.
const weekdayLabels = (locale: string) =>
  Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }));

export const MonthGrid = ({
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
}) => {
  const { locale } = useTranslation();
  const WEEKDAY_LABELS = useMemo(() => weekdayLabels(locale), [locale]);
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
};
