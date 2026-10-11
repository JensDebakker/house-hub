import { useLocalSearchParams } from 'expo-router';
import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';

const HOUSE_COLOR = '#dc2626';

// The trimmed-down former house/index.tsx tile grid - Create/Join moved up to the Houses
// overview as global actions, so only the per-house actions (View/Manage/Leave) remain
// here. Unlike house/[householdId]/dashboard.tsx, this screen wraps itself in its own
// Module: house/[householdId]/_layout.tsx is collapsed (not open) whenever this route is
// showing, same as every other feature screen (chat, files, ...) nested one level under
// that collapsed frame.
export default function HouseScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return (
    <Module title="House" color={HOUSE_COLOR}>
      <TileGrid>
        <Module tile title="View house" subtitle="Details & invite code" href={`/house/${householdId}/view`} color="#db2777" />
        <Module tile title="Manage house" subtitle="Members & roles" href={`/house/${householdId}/manage`} color="#0f766e" />
        <Module tile title="Leave house" subtitle="Remove yourself" href={`/house/${householdId}/leave`} color="#e11d48" />
      </TileGrid>
    </Module>
  );
}
