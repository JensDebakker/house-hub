import { translate } from '@/i18n';

/**
 * Formats the "N members" line shown under a house tile's title on the Houses overview.
 * Online count used to be folded into this same string ("N members · N online") since a
 * house tile's `titleBarDisplays` corner slot, combined with the default-house star already
 * occupying `titleBarActions`, previously collided with the centered title text (see
 * `Module`'s tile-mode `titleInset`, which now reserves clearance for that combination) -
 * online count has since moved to `titleBarDisplays` (an `OnlineBadge`) now that that's
 * fixed, leaving this to format member count alone.
 */
export function formatMemberCount(memberCount: number): string {
  return translate('app.dashboard.memberCount', { count: memberCount });
}
