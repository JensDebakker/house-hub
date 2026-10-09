import { router, Slot, usePathname } from 'expo-router';
import { BigCardShell } from '@/components/BigCardShell';

const HOUSE_COLOR = '#0f766e';

// Same pattern as the Dashboard, one level deeper: this card stays mounted for as long as
// any /house/* route is open, and collapses into a teal frame around View/Leave/Create.
export default function HouseLayout() {
  const pathname = usePathname();
  const collapsed = pathname !== '/house';

  return (
    <BigCardShell
      title="House"
      color={HOUSE_COLOR}
      collapsed={collapsed}
      onCollapsedPress={() => router.replace('/house')}
    >
      <Slot />
    </BigCardShell>
  );
}
