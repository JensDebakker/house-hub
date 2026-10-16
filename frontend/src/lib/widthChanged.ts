// A width-measurement `onLayout` state update is only worth taking if the new value differs
// from the current one by at least this much. Comparing with exact `===` equality instead
// (the original idiom used throughout this file tree) doesn't reliably reach a fixed point on
// real hardware: confirmed via a real-device report of continuous flicker ("the letters keep
// shifting back and forth", not a one-time settle) on `ModuleTile`'s title/badge shrink-to-fit
// chain (badge font size -> badge's own rendered width -> title's clearance -> title's own
// font size) - each pass can shift a GPU-composited real device's sub-pixel rounding by a
// fraction of a pixel in a way that's bit-exact in desktop Chromium (where this was tested and
// never reproduced) but isn't frame-to-frame on real hardware, so the exact-equality guard
// almost never actually held: each "different" float retriggered another render, which could
// shift the next measurement by another fraction of a pixel, indefinitely. A 1px tolerance is
// below what's visually distinguishable anyway, so ignoring differences under it costs nothing
// real while guaranteeing a chain of width-driven state updates actually reaches a fixed point
// instead of chasing sub-pixel noise forever.
const WIDTH_CHANGE_TOLERANCE_PX = 1;

export function widthChanged(prev: number, next: number): boolean {
  return Math.abs(prev - next) >= WIDTH_CHANGE_TOLERANCE_PX;
}
