import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { oppositeCorners } from '@/lib/color';
import { cardSurface } from './cardSurface';

/** The inner content of a collapsed module - its colored surface, the shrunk title bar,
 * tap-to-go-back, and the nested card underneath. Rendered inside the shared entrance-
 * animated wrapper that `Module` keeps ownership of (opacity + transform), so toggling
 * `collapsed` swaps only this (and `ModuleCardBody`), never the outer `View`/`Animated.View`
 * that carries the entrance animation's `containerRef` and transform. */
export const ModuleCollapsedBody = ({
  color,
  header,
  onCollapsedPress,
  children,
}: {
  color: string;
  header: ReactNode;
  onCollapsedPress?: () => void;
  children?: ReactNode;
}) => (
  <View style={{ flex: 1, ...cardSurface(color), ...oppositeCorners(28), overflow: 'hidden' }}>
    <Pressable onPress={onCollapsedPress} style={{ flex: 1 }}>
      {header}
      {/* No margin here - the nested card (children) is itself a Module, which already
          carries its own CARD_MARGIN on every side. Adding a second margin layer on top of
          that would double up the gap between this frame's border and the nested card's
          border, well past what the shrunk title actually frees up. */}
      <View style={{ flex: 1, ...oppositeCorners(20), overflow: 'hidden' }}>
        {/* Swallows taps anywhere inside the nested card so they don't fall through to the
            backdrop Pressable above and bounce back out to this level. */}
        <Pressable style={{ flex: 1 }} onPress={() => {}}>
          {children}
        </Pressable>
      </View>
    </Pressable>
  </View>
);
