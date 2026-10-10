import { useWindowDimensions } from 'react-native';

// Width-based, not Platform.OS-based: a native tablet can be as wide as a desktop browser
// and a mobile browser as narrow as a phone, so the column count follows the actual
// viewport rather than which target built the app.
const BREAKPOINTS = [
  { minWidth: 900, columns: 4 }, // desktop / wide kiosk display
  { minWidth: 600, columns: 3 }, // tablet
  { minWidth: 0, columns: 2 }, // phone
] as const;

// flexBasis stays under the even split (e.g. 45% not 50%) to leave room for the grid's own
// fixed-pixel `gap` between tiles. That gap is a bigger share of a narrower row, so the
// 2-column tier (which only ever applies at the narrowest widths) needs a noticeably wider
// buffer than 3/4-column - a buffer sized for a typical desktop width wasn't enough once
// this same percentage played out on an actual phone-width row (confirmed: 48% wrapped
// down to 1 column per row at 400px, not the intended 2 - at that width the 14px gap alone
// already eats close to 4% of the row, leaving under 2% of actual slack at 48%/tile).
const FLEX_BASIS: Record<number, `${number}%`> = {
  2: '45%',
  3: '30%',
  4: '22%',
};

/** Picks a tile-grid column count from the current window width, and the matching
 * `flexBasis` for each tile's wrapper - shared by every `flexWrap` tile grid (Dashboard,
 * House, Admin) so they all respond to window size the same way. */
export function useResponsiveColumns() {
  const { width } = useWindowDimensions();
  const columns = BREAKPOINTS.find((b) => width >= b.minWidth)?.columns ?? 2;
  return { columns, tileWrapperStyle: { flexBasis: FLEX_BASIS[columns] } as const };
}
