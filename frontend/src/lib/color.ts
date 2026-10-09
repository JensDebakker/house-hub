function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

// Blends a color toward white, used as a card's pastel fill so the accent color
// itself only shows up as the border.
export function pastelize(hex: string, amount = 0.85) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// The corner shape shared by every card in the stack - top-left and bottom-right
// square, top-right and bottom-left rounded.
export function oppositeCorners(radius: number) {
  return {
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopRightRadius: radius,
    borderBottomLeftRadius: radius,
  };
}
