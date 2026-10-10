import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useWebSocketChannel } from '@/contexts/WebSocketContext';
import { pastelize } from '@/lib/color';

const ONLINE_COLOR = '#16a34a';

/** Subscribes to the 'presence' WebSocket channel - call this from a component that stays
 * mounted continuously (not one that gets unmounted/remounted as a module collapses/opens),
 * so the count survives that transition instead of resetting to null and the badge
 * disappearing every time a submodule opens on top of it. */
export function useOnlinePresence() {
  // null until the first "presence" push arrives, so the pill never flashes a stale
  // or zero count before the backend has actually reported one.
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  const handlePresence = useCallback((payload: unknown) => {
    const count = (payload as { count?: number } | undefined)?.count;
    if (typeof count === 'number') setOnlineCount(count);
  }, []);

  useWebSocketChannel('presence', handlePresence);

  return onlineCount;
}

/** A small "N online" pill - rendered as the Dashboard module's title bar display. Purely
 * presentational so it can safely remount (losing no state) as Dashboard's title bar swaps
 * between its collapsed and open render trees; the count itself lives in the caller via
 * `useOnlinePresence`. */
export function OnlineBadge({ count }: { count: number | null }) {
  if (count === null) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: pastelize(ONLINE_COLOR),
        borderWidth: 2,
        borderColor: ONLINE_COLOR,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ONLINE_COLOR }} />
      <Text style={{ color: ONLINE_COLOR, fontSize: 13, fontWeight: '700' }}>{count} online</Text>
    </View>
  );
}
