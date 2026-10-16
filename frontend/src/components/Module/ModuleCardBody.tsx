import type { ReactNode } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { oppositeCorners } from '@/lib/color';
import { cardSurface } from './cardSurface';

/** The inner content of an open module card - its colored surface, title bar, and scrollable
 * (or fixed) content. Rendered inside the shared entrance-animated wrapper that `Module`
 * keeps ownership of (opacity + transform) - see `ModuleCollapsedBody` for why that split
 * exists.
 *
 * When scrollable, the colored card itself is the scroll content - not a fixed-size box with
 * a scroller glued inside it - so it only gets as tall as its content needs, and the bottom
 * rounded corners only come into view once you've actually scrolled to the real end, instead
 * of being clipped at a fixed viewport height.
 */
export const ModuleCardBody = ({
  color,
  scroll,
  header,
  contentOpacity,
  children,
}: {
  color: string;
  scroll: boolean;
  header: ReactNode;
  contentOpacity: Animated.WithAnimatedValue<number>;
  children?: ReactNode;
}) => {
  const card = (
    <View
      style={{
        minHeight: scroll ? '100%' : undefined,
        flex: scroll ? undefined : 1,
        ...cardSurface(color),
        ...oppositeCorners(28),
        overflow: 'hidden',
      }}
    >
      {header}
      <Animated.View
        style={{ flex: scroll ? undefined : 1, paddingHorizontal: 24, paddingBottom: 24, gap: 12, opacity: contentOpacity }}
      >
        {children}
      </Animated.View>
    </View>
  );

  if (!scroll) return card;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ minHeight: '100%' }} showsVerticalScrollIndicator={false}>
      {card}
    </ScrollView>
  );
};
