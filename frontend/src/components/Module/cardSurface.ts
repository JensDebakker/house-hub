import { pastelize } from '@/lib/color';

export const CARD_MARGIN = 6;
const CARD_BORDER_WIDTH = 2;

// A colored card gets a pastel fill with the accent as its border - the same treatment
// used by a tile, so the module's color carries through from tile to opened card.
export const cardSurface = (color: string) => ({
  backgroundColor: pastelize(color),
  borderWidth: CARD_BORDER_WIDTH,
  borderColor: color,
});

// How much horizontal width a single *collapsed* frame's own chrome (its outer
// `margin: CARD_MARGIN` plus `cardSurface`'s own `borderWidth`, both sides) costs a nested
// card that opens inside it - on top of whatever margin that nested card's own `margin:
// CARD_MARGIN` already costs it regardless of nesting. A card reached directly (its own
// parent layout is open, not collapsed around it - e.g. house/[householdId]/dashboard.tsx)
// never pays this; a card reached while its parent collapses around it (e.g. a Screensaver
// section nested inside the already-collapsed House frame) always does. See
// `TileGrid`'s own `extraChromeWidth` for why this matters to anything laying out a
// responsive grid: a `TileGrid` inside a once-nested card measures a real but *consistently*
// narrower width than the exact same content would get sitting directly in its parent's own
// open card - confirmed via Playwright that at specific browser widths (~1080-1095px) this
// was enough to put one screen at 5 grid columns and a nested one at only 3, for tile content
// that's otherwise identical, which reads as "this screen uses different sizing standards"
// even though nothing about the tiles or the grid itself actually differs.
export const COLLAPSED_FRAME_CHROME_WIDTH = 2 * CARD_MARGIN + 2 * CARD_BORDER_WIDTH;
