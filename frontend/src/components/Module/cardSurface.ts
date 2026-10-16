import { pastelize } from '@/lib/color';

export const CARD_MARGIN = 6;

// A colored card gets a pastel fill with the accent as its border - the same treatment
// used by a tile, so the module's color carries through from tile to opened card.
export const cardSurface = (color: string) => ({
  backgroundColor: pastelize(color),
  borderWidth: 2,
  borderColor: color,
});
