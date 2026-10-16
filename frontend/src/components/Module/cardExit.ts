// At most one Module is ever "open" (collapsed=false, not tile/fullscreen) at a time, since
// each level of the card stack only goes active once its own route is the exact match - so a
// single slot is enough to let whichever one is currently open register a reverse-of-entrance
// shrink animation, for `navigateBackFromCard` to play before the route (and this card)
// actually goes away.
let activeCardExit: (() => Promise<void>) | null = null;

/** Registers `exit` as the currently-open card's exit animation. Returns an unregister
 * callback, meant to be returned directly from the calling effect's cleanup. */
export const registerActiveCardExit = (exit: () => Promise<void>) => {
  activeCardExit = exit;
  return () => {
    if (activeCardExit === exit) activeCardExit = null;
  };
};

/** Wraps a "go back to the parent" navigation call so the currently open card's exit
 * animation (if one is registered) finishes before the route change unmounts it. */
export const navigateBackFromCard = (navigate: () => void) => {
  if (!activeCardExit) {
    navigate();
    return;
  }
  const exit = activeCardExit;
  activeCardExit = null;
  exit().then(navigate);
};
