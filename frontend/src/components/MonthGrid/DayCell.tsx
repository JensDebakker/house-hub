import { Pressable, Text } from 'react-native';
import { useTranslation } from '@/i18n';
import { pastelize } from '@/lib/color';
import type { CalendarEvent } from '@/types';

const MAX_TITLE_PREVIEWS = 2;

export const DayCell = ({
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
}) => {
  const { t } = useTranslation();
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
          {t('house.calendar.more', { count: extraCount })}
        </Text>
      ) : null}
    </Pressable>
  );
};
