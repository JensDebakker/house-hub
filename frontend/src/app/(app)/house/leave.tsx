import { Text } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';

const LEAVE_HOUSE_COLOR = '#e11d48';

export default function LeaveHouseScreen() {
  return (
    <BigCardShell title="Leave House" color={LEAVE_HOUSE_COLOR}>
      <Text style={{ color: '#999' }}>Coming soon - self-service leaving a house isn&apos;t wired up yet.</Text>
    </BigCardShell>
  );
}
