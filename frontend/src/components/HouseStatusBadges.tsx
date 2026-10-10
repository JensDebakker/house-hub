import { Text, View } from 'react-native';
import { pastelize } from '@/lib/color';

const MEMBERS_COLOR = '#6366f1';
const ONLINE_COLOR = '#16a34a';

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: pastelize(color),
        borderWidth: 2,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text numberOfLines={1} style={{ color, fontSize: 11, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Composes the "N members" + "N online" pair shown on each house tile on the Houses
 * overview. `Module`'s `titleBarDisplays` is a single `ReactNode` slot, so both pills live
 * inside one wrapping `View` here rather than as two separate Module props - same idiom the
 * Module doc comment on that prop calls out.
 *
 * Both counts come straight off the `/auth/me` membership list (not a live websocket
 * subscription - that's the per-house card's job, see `OnlineBadge`/`useOnlinePresence`),
 * so this is plain presentational content, safe to use from a tile that never opens a
 * socket of its own.
 */
export function HouseStatusBadges({ memberCount, onlineCount }: { memberCount: number; onlineCount: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Pill color={MEMBERS_COLOR} label={`${memberCount} member${memberCount === 1 ? '' : 's'}`} />
      <Pill color={ONLINE_COLOR} label={`${onlineCount} online`} />
    </View>
  );
}
