import { Children, isValidElement, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

const GAP = 14;

// Width-based, not Platform.OS-based: a native tablet can be as wide as a desktop browser
// and a mobile browser as narrow as a phone, so the column count follows the actual
// rendered space rather than which target built the app. Measured against the grid's own
// layout width (not the window's), so it already accounts for whatever margin/padding sits
// between the window edge and the grid itself - no separate chrome-width constant to keep
// in sync with Module.tsx's own spacing.
const BREAKPOINTS = [
  { minWidth: 1000, columns: 5 }, // desktop / wide kiosk display
  { minWidth: 700, columns: 3 }, // tablet
  { minWidth: 0, columns: 2 }, // phone
] as const;

/**
 * A `flexWrap` tile grid whose tiles size themselves to exactly fill the available width -
 * an even division of the grid's own measured width, not an approximate percentage with a
 * guessed-at safety buffer for the `gap` between tiles. A percentage always needs that
 * buffer to avoid wrapping prematurely at the narrow end of whatever width range currently
 * maps to its column count, which means it also always leaves that same buffer's worth of
 * unused space on the right at the wide end of that range - a full, complete row stops
 * short of the grid's actual edge instead of using all of it.
 *
 * `flexGrow` deliberately stays off each tile - an incomplete last row (fewer tiles than
 * the column count) keeps the same per-tile width as every other row instead of stretching
 * to fill the remaining space, so it reads as a real grid with blank slots left over, not a
 * row that reflows to fit however many tiles happen to be left.
 */
export function TileGrid({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (prev === w ? prev : w));
  };

  const columns = BREAKPOINTS.find((b) => width >= b.minWidth)?.columns ?? 2;
  const tileWidth = width > 0 ? (width - (columns - 1) * GAP) / columns : undefined;

  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        // Wraps whatever width the tile element itself already carries (if any) only once
        // the grid's real width is known - before that first layout pass, tiles fall back
        // to flex: 1 so the very first paint isn't a column of zero-width boxes.
        return (
          <View style={tileWidth ? { width: tileWidth } : { flex: 1, minWidth: 140 }}>{child}</View>
        );
      })}
    </View>
  );
}
