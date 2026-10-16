import { Text, View } from 'react-native';
import { TitleBarChip } from '@/components/Module';

export { useOnlinePresence } from './useOnlinePresence';

const ONLINE_COLOR = '#16a34a';

/** A small "N online" pill - rendered as the Dashboard module's title bar display. Purely
 * presentational so it can safely remount (losing no state) as Dashboard's title bar swaps
 * between its collapsed and open render trees; the count itself lives in the caller via
 * `useOnlinePresence`.
 *
 * `compact` drops the " online" label, showing just the dot and the number - for the Houses
 * overview's house tiles, which are too narrow (the online badge sharing a title bar with
 * the default-house star marker, both corners of a small grid tile) for the full label
 * without pushing the title into one or both corner chips. The member count already spelled
 * out in the subtitle below ("N members") gives the dot+number enough context on its own. */
export const OnlineBadge = ({ count, compact = false }: { count: number | null; compact?: boolean }) => {
  if (count === null) return null;

  return (
    <TitleBarChip color={ONLINE_COLOR}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ONLINE_COLOR }} />
      <Text style={{ color: ONLINE_COLOR, fontSize: 13, fontWeight: '700' }}>{compact ? count : `${count} online`}</Text>
    </TitleBarChip>
  );
};
