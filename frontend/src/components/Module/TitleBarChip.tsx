import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { pastelize } from '@/lib/color';

/** Rounded "chip" box for a title bar display or action - the same pastel-fill-with-a-
 * colored-border treatment `cardSurface` gives a whole card, scaled down into a pill. Standard
 * container for anything that sits in `titleBarDisplays`/`titleBarActions`, e.g. the online-
 * count badge, so the title bar reads as one consistent visual language instead of each caller
 * inventing its own badge style. Pass `onPress` to make the chip itself tappable (it's still
 * wrapped by `TitleBarSlot`'s own tap-swallowing Pressable, same as any other title bar
 * content); omit it for a purely informational chip. */
export const TitleBarChip = ({
  color,
  onPress,
  disabled,
  compact = false,
  children,
}: {
  color: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Tighter padding - for a corner badge on a narrow 2-column phone tile, where the chip's
   * own chrome (normally ~28px of fixed padding+border) competes directly with the tile's
   * title for a very small amount of total width. Confirmed via a real rendered page that the
   * standard padding alone could cost enough room to force a title into a floor-sized,
   * still-wrapping font even after the chip's own text had already shrunk to fit - every px of
   * fixed chrome matters at that scale. Unused by every other caller (the open/collapsed card
   * header's badges, tile actions like Screensaver's "Start") - they have comparatively more
   * room, and shrinking their chrome too isn't what was reported broken. */
  compact?: boolean;
  children: ReactNode;
}) => {
  const box = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: pastelize(color),
        borderWidth: 2,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: compact ? 8 : 12,
        paddingVertical: compact ? 4 : 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </View>
  );
  if (!onPress) return box;
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {box}
    </Pressable>
  );
};
