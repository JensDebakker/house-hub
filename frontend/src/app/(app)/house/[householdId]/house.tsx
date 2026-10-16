import { useLocalSearchParams } from 'expo-router';
import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useTranslation } from '@/i18n';

const HOUSE_COLOR = '#dc2626';

// The trimmed-down former house/index.tsx tile grid - Create/Join moved up to the Houses
// overview as global actions, so only the per-house actions (View/Manage/Leave) remain
// here. Unlike house/[householdId]/dashboard.tsx, this screen wraps itself in its own
// Module: house/[householdId]/_layout.tsx is collapsed (not open) whenever this route is
// showing, same as every other feature screen (chat, files, ...) nested one level under
// that collapsed frame.
export default function HouseScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { t } = useTranslation();

  return (
    <Module title={t('house.house.title')} color={HOUSE_COLOR}>
      <TileGrid>
        <Module tile title={t('house.house.viewTitle')} subtitle={t('house.house.viewSubtitle')} href={`/house/${householdId}/view`} color="#db2777" />
        <Module tile title={t('house.house.manageTitle')} subtitle={t('house.house.manageSubtitle')} href={`/house/${householdId}/manage`} color="#0f766e" />
        <Module tile title={t('house.house.leaveTitle')} subtitle={t('house.house.leaveSubtitle')} href={`/house/${householdId}/leave`} color="#e11d48" />
      </TileGrid>
    </Module>
  );
}
