import { useWebSocket } from '@/contexts/WebSocketContext';

/** The current household's online-member count - `null` until the first "presence" message
 * for it has arrived. Tracked centrally in `WebSocketContext` (not a `useState` local to
 * this hook) so a caller that unmounts and remounts - e.g. house/[householdId]/_layout.tsx
 * across a round trip through the real screensaver kiosk display, a separate top-level route
 * the socket connection deliberately stays open through rather than reconnecting - picks the
 * count straight back up instead of getting stuck at `null` with no new "presence" message
 * ever going to arrive to fill it in (the backend only re-broadcasts presence on an actual
 * socket connect/disconnect, and there isn't one of those on this specific round trip). See
 * `WebSocketContext`'s own `presenceCount` for the full reasoning. */
export const useOnlinePresence = () => {
  return useWebSocket().presenceCount;
};
