import { useCallback, useState } from 'react';
import { useWebSocketChannel } from '@/contexts/WebSocketContext';

/** Subscribes to the 'presence' WebSocket channel - call this from a component that stays
 * mounted continuously (not one that gets unmounted/remounted as a module collapses/opens),
 * so the count survives that transition instead of resetting to null and the badge
 * disappearing every time a submodule opens on top of it. */
export const useOnlinePresence = () => {
  // null until the first "presence" push arrives, so the pill never flashes a stale
  // or zero count before the backend has actually reported one.
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  const handlePresence = useCallback((payload: unknown) => {
    const count = (payload as { count?: number } | undefined)?.count;
    if (typeof count === 'number') setOnlineCount(count);
  }, []);

  useWebSocketChannel('presence', handlePresence);

  return onlineCount;
};
