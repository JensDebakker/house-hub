import { router, usePathname } from 'expo-router';
import { useState, type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import { oppositeCorners } from '@/lib/color';
import { navigateToHref } from '@/lib/navigation';
import { cardSurface } from './cardSurface';
import { entersFreshDynamicSegment } from './routeGroup';
import { TitleBarChip } from './TitleBarChip';
import type { TitleBarContent } from './types';

const CORNER_BADGE_CLEARANCE = 46;
const BASE_TILE_TITLE_FONT_SIZE = 17;

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
  // Each corner reserves clearance independently (`titleInsetLeft`/`titleInsetRight`),
  // rather than always reserving the same amount symmetrically on *both* sides whenever
  // *either* one is populated - confirmed via Playwright that fully symmetric clearance
  // overcorrects on a narrow 2-column phone tile: a single ~46px badge already consumes a
  // third of a ~130px tile's total width, so reserving that *again* on the empty side left
  // as little as 9px of actual title width and forced the title down to a barely-legible,
  // badly-wrapped sliver even for a short word like "Screensaver". A tile with both corners
  // populated still reserves both sides.
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
  const titleInsetLeft = hasLeftBadge ? CORNER_BADGE_CLEARANCE : 0;
  const titleInsetRight = hasRightBadge ? CORNER_BADGE_CLEARANCE : 0;
  // Subtracts the Pressable's own `padding: 16` on both sides, matching the box the title
  // actually renders inside.
  const tileContentWidth = tileWidth !== null ? tileWidth - 32 : undefined;
  const availableTileTitleWidth =
    tileContentWidth !== undefined ? tileContentWidth - titleInsetLeft - titleInsetRight : undefined;
  const tileTitleFitScale =
    availableTileTitleWidth !== undefined && availableTileTitleWidth > 0 && naturalTileTitleWidth > 0
      ? Math.max(10 / BASE_TILE_TITLE_FONT_SIZE, Math.min(1, availableTileTitleWidth / naturalTileTitleWidth))
      : 1;
  const titleFontSize = BASE_TILE_TITLE_FONT_SIZE * tileTitleFitScale;

  return (
    <Pressable
      ref={containerRef}
      onPress={onTilePress}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        setTileWidth((prev) => (prev === width ? prev : width));
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
          setNaturalTileTitleWidth((prev) => (prev === width ? prev : width));
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
          a display, so the two can never land in the same corner. Both corners cap at 45%
          of the tile's own width (percentage resolves against the tile, the nearest
          positioned ancestor) with overflow hidden - on a small tile from a dense grid
          column count, fixed-size badge content must never spill past the tile's edge. */}
      {disabled ? (
        <View style={{ position: 'absolute', top: 10, left: 10, maxWidth: '45%', overflow: 'hidden' }}>
          <TitleBarChip color="#6b7280">
            <Text numberOfLines={1} style={{ color: '#6b7280', fontSize: 11, fontWeight: '700' }}>Coming soon</Text>
          </TitleBarChip>
        </View>
      ) : titleBarDisplays ? (
        <View style={{ position: 'absolute', top: 10, left: 10, maxWidth: '45%', overflow: 'hidden' }}>
          <Pressable onPress={() => {}}>{titleBarDisplays}</Pressable>
        </View>
      ) : null}

      {!disabled && titleBarActions ? (
        <View style={{ position: 'absolute', top: 10, right: 10, maxWidth: '45%', overflow: 'hidden' }}>
          <Pressable onPress={() => {}}>{titleBarActions}</Pressable>
        </View>
      ) : null}
    </Pressable>
  );
};
