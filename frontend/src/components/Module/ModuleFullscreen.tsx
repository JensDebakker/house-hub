import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { TitleBarContent } from './types';

/** Renders a `Module` full-bleed, no border/pastel background or margin - e.g. a kiosk
 * display. See `Module` for the shared mode picture. */
export const ModuleFullscreen = ({
  titleBarDisplays,
  titleBarActions,
  children,
}: TitleBarContent & { children: ReactNode }) => {
  const showBar = !!(titleBarDisplays || titleBarActions);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* No title text here - a floating "Screensaver" label would visually compete with
          the clock overlay this kiosk display already renders as its own content. Only
          displays/actions (if any) show, anchored clear of that top-left corner. */}
      {showBar ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {titleBarDisplays ? (
            <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {titleBarDisplays}
            </Pressable>
          ) : null}
          {titleBarActions ? (
            <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {titleBarActions}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};
