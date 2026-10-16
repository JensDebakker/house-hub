import { useLocalSearchParams, usePathname } from 'expo-router';
import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';

export default function ScreensaverIndexScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const pathname = usePathname();
  const basePath = `/house/${householdId}/screensaver`;
  // The kiosk display itself is a separate top-level route (screensaver/[householdId]/start,
  // not house/[householdId]/screensaver/start) - it needs to escape this card's nesting
  // entirely to take over the whole screen, unlike Layout/AutoStart which are ordinary
  // settings screens that belong nested in here like any other feature tile.
  const startHref = `/screensaver/${householdId}/start`;

  return (
    <TileGrid>
      <Module
        tile
        title="Start"
        subtitle="Launch kiosk display"
        href={startHref}
        extraParams={{ returnTo: pathname }}
        color="#7c3aed"
      />
      <Module tile title="Layout" subtitle="Overlay elements & position" href={`${basePath}/layout`} color="#9333ea" />
      <Module tile title="AutoStart" subtitle="Idle auto-launch" href={`${basePath}/autostart`} color="#a855f7" />
    </TileGrid>
  );
}
