import { Text, View } from 'react-native';
import type { FeedbackStatus } from '@/types';

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; fg: string }> = {
  OPEN: { bg: '#dbeafe', fg: '#1d4ed8' },
  IN_PROGRESS: { bg: '#fef3c7', fg: '#b45309' },
  RESOLVED: { bg: '#dcfce7', fg: '#15803d' },
  CLOSED: { bg: '#e5e7eb', fg: '#374151' },
};

/** Shared small status pill, used on both the user's own ticket list and the admin
 * list/detail screens so the color coding stays consistent across both. */
export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{status.replace('_', ' ')}</Text>
    </View>
  );
}
