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
  children,
}: {
  color: string;
  onPress?: () => void;
  disabled?: boolean;
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
        paddingHorizontal: 12,
        paddingVertical: 6,
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
