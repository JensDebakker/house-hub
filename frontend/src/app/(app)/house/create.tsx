import { Text } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';

const CREATE_HOUSE_COLOR = '#c026d3';

export default function CreateHouseScreen() {
  return (
    <BigCardShell title="Create House" color={CREATE_HOUSE_COLOR}>
      <Text style={{ color: '#999' }}>Coming soon - self-service house creation isn&apos;t wired up yet.</Text>
    </BigCardShell>
  );
}
