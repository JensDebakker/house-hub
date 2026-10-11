/**
 * Formats the "N members · N online" line shown under a house tile's title on the Houses
 * overview. A `Module` tile's `titleBarDisplays` corner slot is capped at 45% of the
 * tile's width with `overflow: hidden` (so fixed-size badge content never spills past a
 * narrow tile) - fine for one short pill (the default-house star, in `titleBarActions`),
 * but two side-by-side pills here clipped and visually collided with the centered title
 * text on anything but a very wide tile (confirmed via a Playwright screenshot during
 * manual testing). `subtitle` is plain centered text in normal flow directly under the
 * title - exactly what every other tile already uses for secondary info (e.g. "Kiosk
 * slideshow"), so reusing it here avoids the corner slot's width/overlap problems
 * entirely instead of working around them.
 */
export function formatHouseStatus(memberCount: number, onlineCount: number): string {
  return `${memberCount} member${memberCount === 1 ? '' : 's'} · ${onlineCount} online`;
}
