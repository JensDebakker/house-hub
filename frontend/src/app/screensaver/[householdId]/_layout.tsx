import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { Module, navigateBackFromCard } from '@/components/Module';

const SCREENSAVER_COLOR = '#7c3aed';

// Same pattern as Admin: this card stays mounted for as long as any /screensaver/[id]/*
// route is open, and collapses into a purple frame around whichever submodule (Layout,
// AutoStart) is open on top of it. Start is the odd one out - it renders its own
// fullscreen kiosk Module and must never end up nested inside this layout's collapsed
// frame (which reserves a title bar and margin that would break the full-bleed look), so
// it bypasses this wrapper entirely and renders directly via <Slot/>.
export default function ScreensaverLayout() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const pathname = usePathname();
  const basePath = `/screensaver/${householdId}`;

  if (pathname === `${basePath}/start`) return <Slot />;

  return (
    <Module
      title="Screensaver"
      color={SCREENSAVER_COLOR}
      collapsed={pathname !== basePath}
      onCollapsedPress={() => navigateBackFromCard(() => router.replace(`/screensaver/${householdId}`))}
    >
      <Slot />
    </Module>
  );
}
