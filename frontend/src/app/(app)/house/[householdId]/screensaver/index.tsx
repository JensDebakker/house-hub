import { useLocalSearchParams, usePathname } from 'expo-router';
import { COLLAPSED_FRAME_CHROME_WIDTH, Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useTranslation } from '@/i18n';

export default function ScreensaverIndexScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const pathname = usePathname();
  const { t } = useTranslation();
  const basePath = `/house/${householdId}/screensaver`;
  // The kiosk display itself is a separate top-level route (screensaver/[householdId]/start,
  // not house/[householdId]/screensaver/start) - it needs to escape this card's nesting
  // entirely to take over the whole screen, unlike Layout/AutoStart which are ordinary
  // settings screens that belong nested in here like any other feature tile.
  const startHref = `/screensaver/${householdId}/start`;

  return (
    // This screen's own Module (see screensaver/_layout.tsx) opens one collapsed House
    // frame deeper than house/[householdId]/dashboard.tsx's tile grid does (House stays
    // open there; it collapses around Screensaver here) - without this, the exact same
    // tile content picks a *different* column count than the dashboard's own grid at
    // certain browser widths. See TileGrid's own extraChromeWidth comment.
    <TileGrid extraChromeWidth={COLLAPSED_FRAME_CHROME_WIDTH}>
      <Module
        tile
        title={t('screensaver.start')}
        subtitle={t('screensaver.index.startSubtitle')}
        href={startHref}
        extraParams={{ returnTo: pathname }}
        color="#7c3aed"
      />
      <Module tile title={t('screensaver.index.layoutTitle')} subtitle={t('screensaver.index.layoutSubtitle')} href={`${basePath}/layout`} color="#9333ea" />
      <Module tile title={t('screensaver.index.autostartTitle')} subtitle={t('screensaver.index.autostartSubtitle')} href={`${basePath}/autostart`} color="#a855f7" />
    </TileGrid>
  );
}
