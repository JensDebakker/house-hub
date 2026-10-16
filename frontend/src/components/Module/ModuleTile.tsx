import { router, usePathname } from 'expo-router';
import { useState, type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import { oppositeCorners } from '@/lib/color';
import { navigateToHref } from '@/lib/navigation';
import { cardSurface } from './cardSurface';
import { entersFreshDynamicSegment } from './routeGroup';
import { TitleBarChip } from './TitleBarChip';
import type { TitleBarContent } from './types';
import { widthChanged } from '@/lib/widthChanged';

// Fallback clearance used only before a corner's real width has been measured (first paint) -
// see `titleInsetLeft`/`titleInsetRight` below, which switch to the corner's actual measured
// width (`leftBadgeWidth`/`rightBadgeWidth`) as soon as it's available. Kept as a reasonable
// guess for that first frame only, not as the steady-state value it used to be - a fixed guess
// was confirmed (real-world report: a "Coming soon" badge, which is wider than this guess,
// overlapping/wrapping the "Shopping" tile's title) to go wrong for any corner content wider
// than the guess itself.
const CORNER_BADGE_CLEARANCE = 46;
const BASE_TILE_TITLE_FONT_SIZE = 17;
const BASE_CORNER_BADGE_FONT_SIZE = 11;
// The title's own available width (after both sides' symmetric clearance) never drops below
// this, no matter how wide a corner badge measures - see `maxTitleInset` below.
const MIN_TILE_TITLE_WIDTH = 40;
// TitleBarChip's own `compact` paddingHorizontal (8 each side) + borderWidth (2 each side) -
// the "Coming soon" text's own available width is the corner's 45%-of-tile budget minus this
// chip chrome, not the full 45% (that overcounts, letting the text size itself larger than
// what the chip can actually show without its border clipping it).
const CORNER_BADGE_CHROME = 2 * (8 + 2);
// A shrink-to-fit scale computed as an *exact* ratio (available / natural) converges on a
// render that's precisely as wide as its budget, with zero margin for error - confirmed via a
// real rendered page that a title and a badge both computed to fit exactly (ratio capped at
// `Math.min(1, ...)` landing right at 1.0's boundary) still sometimes wrapped/overflowed by a
// hair anyway: the hidden sibling's measured "natural" width and the same text's real width
// once actually rendered at the *scaled-down* font aren't perfectly, linearly proportional
// (sub-pixel font hinting/kerning doesn't scale exactly linearly with font-size), so trusting
// an exact-fit ratio is the same class of bug the TileGrid column layout had (see
// TileGrid.tsx's own `Math.floor` fix) - this shaves a few px off the budget a scale is
// computed against, same idea as flooring there, so a "fits exactly" title/badge actually
// renders with a little real headroom instead of sitting exactly on the edge of wrapping.
const FIT_SCALE_SAFETY_MARGIN = 3;

/** Renders a `Module` as a small tappable grid tile - the entry point that opens the full
 * card, rather than the card itself. See `Module` for the shared mode picture. */
export const ModuleTile = ({
  containerRef,
  title,
  color,
  href,
  extraParams,
  subtitle,
  disabled = false,
  titleBarDisplays,
  titleBarActions,
}: {
  containerRef: RefObject<View | null>;
  title: string;
  color: string;
  href?: string;
  extraParams?: Record<string, string>;
  subtitle?: string;
  disabled?: boolean;
} & TitleBarContent) => {
  const pathname = usePathname();
  // The tile's own rendered width, so the title's inset can be given as a definite number
  // rather than a percentage. A percentage `width` on the title's wrapper View never
  // resolved against the tile's actual size here (confirmed by inspecting the rendered
  // layout: it fell back to shrink-to-content, i.e. 0 width plus whatever padding was set)
  // even though the tile itself has a perfectly definite width by the time it renders
  // (TileGrid gives each tile an explicit numeric `width` style) - a plain numeric `width`
  // resolves correctly where the equivalent percentage didn't.
  const [tileWidth, setTileWidth] = useState<number | null>(null);
  // The title's natural (single-line, base-font-size) width, measured via a hidden shadow
  // sibling the same way ModuleTitleBar measures its own title - see `tileTitleFitScale`
  // below for how this turns into a shrink factor.
  const [naturalTileTitleWidth, setNaturalTileTitleWidth] = useState(0);
  // The "Coming soon" badge's natural (base-font-size) width, measured the same way the
  // title's own is - see `comingSoonFitScale` below.
  const [naturalComingSoonWidth, setNaturalComingSoonWidth] = useState(0);
  // Each populated corner's own actual rendered width (whatever it contains - "Coming soon",
  // or a caller-supplied `titleBarDisplays`/`titleBarActions` node like the online-count badge
  // or Screensaver's "Start" action) - real measurement, not a guess, so the title's own
  // clearance below always matches what's actually on screen regardless of which case it is.
  const [leftBadgeWidth, setLeftBadgeWidth] = useState(0);
  const [rightBadgeWidth, setRightBadgeWidth] = useState(0);

  const onTilePress = () => {
    if (disabled || !href) return;
    containerRef.current?.measureInWindow((x, y, width, height) => {
      const cardParams = {
        cardX: String(x),
        cardY: String(y),
        cardW: String(width),
        cardH: String(height),
        ...extraParams,
      };
      if (entersFreshDynamicSegment(pathname, href)) {
        navigateToHref(href, cardParams);
      } else {
        router.push({ pathname: href as never, params: cardParams });
      }
    });
  };

  // Both tile corners are absolutely positioned overlays, not in-flow siblings of the
  // centered title text below - on purpose, so a tile's title sits at the same height
  // whether or not that particular tile happens to have a corner badge, keeping every
  // tile's title row aligned across a grid. That means the title itself has to stay clear
  // of whichever corners are actually populated, rather than the corners making room for
  // it.
  //
  // Both sides always reserve the SAME clearance - whichever populated corner's badge is
  // wider - so the title stays dead-center on the tile regardless of which corner (or both,
  // or neither) is actually populated, same symmetric-inset reasoning `ModuleTitleBar` uses
  // for the open/collapsed card header's own title. An earlier version of this reserved
  // clearance per-corner independently instead (cheaper on the title's own available width,
  // at the cost of the title visibly drifting off-center whenever only one corner had a
  // badge) - centering the title is now the higher-priority rule, so the badge itself is
  // what absorbs the extra cost of symmetric clearance (see `comingSoonFitScale`'s own floor
  // below), not the title losing its center.
  //
  // `tileTitleFitScale` measures how wide the title wants to be at the base font size (via
  // the hidden shadow sibling, `naturalTileTitleWidth` state above - same "sibling kept
  // entirely out of the box its own measurement feeds into" idiom `TitleBarSlot`/
  // `ModuleTitleBar` already use) and compares that against how much width the tile's own
  // measured size (`tileWidth`) actually leaves once the corner clearance above is
  // subtracted - so a title that's merely a bit too wide for a narrow 2-column phone tile
  // shrinks to fit instead of wrapping into a cramped 3-line block. `numberOfLines={3}` on
  // the title `Text` stays on as a backstop below the floor this clamps to, for a title long
  // enough that no reasonable shrink makes it fit on one line anyway.
  //
  // The inset is a fixed px number, not a `%`/`'100%'`-based one, and the title is wrapped
  // in a `View` explicitly sized to the tile's own *measured* width (`tileWidth` state,
  // above) rather than relying on the Text's own shrink-to-fit sizing or a percentage
  // width to establish that box: both were tried and, per actual rendered layout
  // (inspected directly, not guessed at) resolved to zero content width plus whatever
  // padding was set, instead of the tile's real available width - a React Native Web
  // quirk with percentage sizing in this nested-flex position, not a logic bug. A plain
  // number resolves correctly where the equivalent `%`/`'100%'` didn't. `overflow:
  // 'hidden'` on that same wrapper is a hard backstop against any further overflow -
  // title text is arbitrary data (a household's own name), so there's no guarantee any
  // fixed clearance is generous enough for every possible name at every tile width.
  const hasLeftBadge = disabled || !!titleBarDisplays;
  const hasRightBadge = !disabled && !!titleBarActions;
  // Subtracts the Pressable's own `padding: 16` on both sides, matching the box the title
  // actually renders inside.
  const tileContentWidth = tileWidth !== null ? tileWidth - 32 : undefined;
  // The wider of the two populated corners' real measured widths (0 for a corner that isn't
  // populated), +8 the same flat breathing-room gap ModuleTitleBar's own `sideInset` adds
  // past a badge's edge - falling back to the fixed guess only before any real measurement
  // has landed yet (first frame).
  const leftClearance = hasLeftBadge ? (leftBadgeWidth > 0 ? leftBadgeWidth + 8 : CORNER_BADGE_CLEARANCE) : 0;
  const rightClearance = hasRightBadge ? (rightBadgeWidth > 0 ? rightBadgeWidth + 8 : CORNER_BADGE_CLEARANCE) : 0;
  const symmetricInset = Math.max(leftClearance, rightClearance);
  // Symmetric (same reservation on both sides, regardless of which corner is actually
  // populated) keeps the title dead-center on the tile - same reasoning `ModuleTitleBar`
  // already uses for the open/collapsed card header's own title - and is the default. But
  // symmetric reservation costs the title *double* a single badge's width (both sides pay
  // it, even though only one side has anything in it), which on a narrow 2-column phone tile
  // can exceed the tile's entire content width outright: confirmed via a real rendered page
  // that an unconditionally-symmetric version collapsed the title to a literal zero-width,
  // invisible box. Centering a title that isn't there at all isn't a win, so this falls back
  // to the cheaper per-corner (asymmetric, off-center but never starved) reservation whenever
  // symmetric would leave less than `MIN_TILE_TITLE_WIDTH` to work with - the badge itself
  // still does almost all of the compressing in the common case (see `comingSoonFitScale`'s
  // own floor below), so this fallback is a last resort, not the everyday path.
  const symmetricFits =
    tileContentWidth === undefined || tileContentWidth - 2 * symmetricInset >= MIN_TILE_TITLE_WIDTH;
  const titleInsetLeft = symmetricFits ? symmetricInset : leftClearance;
  const titleInsetRight = symmetricFits ? symmetricInset : rightClearance;
  const availableTileTitleWidth =
    tileContentWidth !== undefined ? tileContentWidth - titleInsetLeft - titleInsetRight : undefined;
  const tileTitleFitScale =
    availableTileTitleWidth !== undefined && availableTileTitleWidth > 0 && naturalTileTitleWidth > 0
      ? Math.max(
          7 / BASE_TILE_TITLE_FONT_SIZE,
          Math.min(1, (availableTileTitleWidth - FIT_SCALE_SAFETY_MARGIN) / naturalTileTitleWidth),
        )
      : 1;
  // Floored, not left as a raw fraction nor simply rounded, to the nearest half px: a
  // continuously-varying fractional font-size (e.g. 8.169px vs 8.166px from one render to the
  // next, from tiny measurement jitter) renders with visibly different sub-pixel
  // antialiasing each time, which showed up as spurious visual-snapshot diffs in e2e even
  // though the actual layout (line count, overlap) was identical both times; flooring (not
  // rounding to nearest) also avoids rounding UP past the safety-margined budget this was
  // just computed to fit within.
  const titleFontSize = Math.floor(BASE_TILE_TITLE_FONT_SIZE * tileTitleFitScale * 2) / 2;

  // 45% of the tile's own width is the SOFT target this shrink math aims the badge at (the
  // generic titleBarDisplays/titleBarActions corner below still hard-caps there too; the
  // disabled/"Coming soon" corner no longer does - see that branch's own comment for why).
  // The "Coming soon" text's own budget is that 45% minus the chip chrome around it, so the
  // text shrinks to fit *inside* the chip rather than sizing itself as if it had the chip's
  // own outer footprint to fill. Same shrink-to-fit idiom as the title above: a hidden shadow
  // sibling measures the text's natural (base-font-size) width, compared against the budget,
  // floored low (7px) rather than letting `overflow: hidden` on the corner's outer View
  // hard-clip it mid-word - "Coming soon" (11 characters) next to an 8-character title on a
  // narrow 2-column phone tile needs real headroom before either one runs out of room to
  // shrink into and has to fall back to wrapping/truncating.
  const comingSoonBudget = tileWidth !== null ? 0.45 * tileWidth - CORNER_BADGE_CHROME : undefined;
  const comingSoonFitScale =
    comingSoonBudget !== undefined && comingSoonBudget > 0 && naturalComingSoonWidth > 0
      ? Math.max(
          7 / BASE_CORNER_BADGE_FONT_SIZE,
          Math.min(1, (comingSoonBudget - FIT_SCALE_SAFETY_MARGIN) / naturalComingSoonWidth),
        )
      : 1;
  // Floored, not rounded, for the same reason titleFontSize is - see its own comment above.
  const comingSoonFontSize = Math.floor(BASE_CORNER_BADGE_FONT_SIZE * comingSoonFitScale * 2) / 2;

  return (
    <Pressable
      ref={containerRef}
      onPress={onTilePress}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        setTileWidth((prev) => (prev !== null && !widthChanged(prev, width) ? prev : width));
      }}
      style={({ pressed }) => [
        {
          ...cardSurface(color),
          ...oppositeCorners(18),
          padding: 16,
          aspectRatio: 1.5,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
        },
        !disabled && pressed && { opacity: 0.85 },
      ]}
    >
      {/* Hidden, unscaled sibling measuring how wide the title wants to be at the base
          font size - see tileTitleFitScale above. Absolutely positioned and out of flow
          so it never contributes to (or gets constrained by) the Pressable's own size,
          same "sibling kept entirely out of the box its own measurement feeds into" idiom
          TitleBarSlot/ModuleTitleBar use for their own measurements. */}
      <Text
        aria-hidden
        style={{ position: 'absolute', opacity: 0, fontSize: BASE_TILE_TITLE_FONT_SIZE, fontWeight: '700' }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          setNaturalTileTitleWidth((prev) => (!widthChanged(prev, width) ? prev : width));
        }}
      >
        {title}
      </Text>
      <View style={{ width: tileContentWidth, paddingLeft: titleInsetLeft, paddingRight: titleInsetRight, overflow: 'hidden' }}>
        <Text numberOfLines={3} style={{ fontSize: titleFontSize, fontWeight: '700', color, textAlign: 'center' }}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}

      {/* Left corner is the display slot, same as the title bar row in card mode - "Coming
          soon" is a read-only status for an inactive module, not an action, so it belongs
          here. Right stays reserved exclusively for titleBarActions (real buttons), never
          a display, so the two can never land in the same corner.

          The disabled ("Coming soon") corner has no `maxWidth` cap, unlike the generic
          `titleBarDisplays`/`titleBarActions` case below - it used to share the same `45%`
          cap, but that's a hard, font-size-independent ceiling that actively fights
          `comingSoonFitScale` (confirmed via a real rendered page: `scrollWidth` > `clientWidth`
          on the text even once its font-size was correctly shrunk to its own floor - the cap
          was still clipping it via `text-overflow: ellipsis`, exactly the "cut off instead of
          scaling down" symptom reported). Since this corner's content is both known (always
          literally "Coming soon") and already shrink-to-fit via its own floor, it doesn't need
          a second, independent ceiling - letting it size to its natural (already-shrunk)
          content and feed that real width into the title's own clearance (`leftBadgeWidth`
          below) is what actually keeps the two from overlapping, not an arbitrary percentage. */}
      {disabled ? (
        <View
          style={{ position: 'absolute', top: 10, left: 10, overflow: 'hidden' }}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            setLeftBadgeWidth((prev) => (!widthChanged(prev, width) ? prev : width));
          }}
        >
          {/* Hidden, unscaled sibling measuring how wide "Coming soon" wants to be at the
              base font size - see comingSoonFitScale above. */}
          <Text
            aria-hidden
            style={{ position: 'absolute', opacity: 0, fontSize: BASE_CORNER_BADGE_FONT_SIZE, fontWeight: '700' }}
            onLayout={(e) => {
              const { width } = e.nativeEvent.layout;
              setNaturalComingSoonWidth((prev) => (!widthChanged(prev, width) ? prev : width));
            }}
          >
            Coming soon
          </Text>
          <TitleBarChip color="#6b7280" compact>
            <Text numberOfLines={1} style={{ color: '#6b7280', fontSize: comingSoonFontSize, fontWeight: '700' }}>
              Coming soon
            </Text>
          </TitleBarChip>
        </View>
      ) : titleBarDisplays ? (
        <View
          style={{ position: 'absolute', top: 10, left: 10, maxWidth: '45%', overflow: 'hidden' }}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            setLeftBadgeWidth((prev) => (!widthChanged(prev, width) ? prev : width));
          }}
        >
          <Pressable onPress={() => {}}>{titleBarDisplays}</Pressable>
        </View>
      ) : null}

      {!disabled && titleBarActions ? (
        <View
          style={{ position: 'absolute', top: 10, right: 10, maxWidth: '45%', overflow: 'hidden' }}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            setRightBadgeWidth((prev) => (!widthChanged(prev, width) ? prev : width));
          }}
        >
          <Pressable onPress={() => {}}>{titleBarActions}</Pressable>
        </View>
      ) : null}
    </Pressable>
  );
};
