import { useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { TitleBarSlot } from './TitleBarSlot';
import { ModuleTitleBarTitle } from './ModuleTitleBarTitle';
import { widthChanged } from '@/lib/widthChanged';

/**
 * Lays out a module's title bar: optional displays on the left, optional action buttons on
 * the right, the title centered. Shared by the collapsed, open and fullscreen render modes -
 * each just passes either Animated interpolations (collapsed/open, so the bar shrinks in
 * sync with the title as the module collapses) or plain static numbers (fullscreen, which
 * has no parent to collapse in response to) for the sizing fields; Animated.View/Text accept
 * either in the same style object.
 *
 * The title is centered on the *whole bar*, not just the leftover space between the two
 * slots: it's rendered as a layer absolutely positioned over the bar's content box
 * (`position: 'relative'` is React Native's default, so no extra style is needed to anchor
 * it there), while displays/actions sit in a normal flex row underneath with an invisible
 * flexible spacer between them. That keeps the title dead-center regardless of how wide the
 * two slots are relative to each other. `pointerEvents="none"` on the title layer keeps it
 * from stealing taps meant for the slots underneath (or the collapsed frame's
 * tap-to-go-back) - the title itself has never been tappable here, unlike in tile mode.
 *
 * The title layer's own `left`/`right` insets aren't pinned to `paddingHorizontal` alone -
 * each slot reports its own natural (pre-scale) width up via `onNaturalWidth`, and both insets
 * add `scale * max(leftWidth, rightWidth)` on top of that base padding. Using the same (larger)
 * value on *both* sides is what keeps the title's available box centered and symmetric
 * (instead of off-center toward whichever slot happens to be narrower) while guaranteeing it
 * never overlaps either slot: a title long enough to reach that inset now shrinks to fit
 * (`titleFitScale` below) instead of rendering on top of a chip - title text is arbitrary
 * data (e.g. a household's own name), not layout the two slots can be assumed to leave room
 * for on their own.
 *
 * The title layer's `top`/`bottom` insets are the bar's own `paddingTop`/`paddingBottom`, not
 * 0 - a `position: 'absolute'` child's `top`/`bottom: 0` is flush with the *border* box of its
 * positioned ancestor (confirmed empirically: it ignores the ancestor's own padding entirely,
 * same as plain CSS), so pinning both to 0 made the title center on the bar's full height
 * regardless of how asymmetric paddingTop/paddingBottom were set to be - the deliberate
 * imbalance between them (see `useCollapseAnimation`) had no visible effect at all.
 * Insetting by the actual padding values instead makes the title track the same content box
 * the slot row already sits in, so the two stay vertically aligned with each other and the
 * padding asymmetry finally reaches the screen.
 *
 * `barMinHeight` reserves enough vertical space for the title's own line height even when
 * both slots are empty - without it, an empty flex row has no content to size itself by, the
 * bar would collapse to just its padding, and the absolutely-positioned title (which spans the
 * content box's actual height, per the `top`/`bottom` insets above) would get squeezed into
 * that near-zero space instead of reading at its intended font size. Because `minHeight`
 * constrains the bar's *total* (border-box) height, the caller has to add paddingTop +
 * paddingBottom into `barMinHeight` itself on top of the line-height figure - otherwise
 * `minHeight` alone caps the total height at just the line-height estimate and the padding
 * budget gets silently absorbed rather than actually reserved (see `useCollapseAnimation`).
 * `justifyContent: 'center'` on the outer box then keeps the slot row vertically centered
 * within that reserved height too, so a display/action chip and the title share the same
 * vertical middle - not pinned to the top with the title centered below it.
 *
 * `titleFitScale` is the piece that keeps a long title (a household's own name - arbitrary
 * data, no guaranteed length) from ever hard-truncating on a narrow phone bar: a hidden,
 * unscaled sibling (`naturalTitleWidth` below) measures how wide the title text actually
 * wants to be at the bar's fully-open `baseFontSize`, and that's compared against how much
 * width the bar has *actually* measured itself at (`barWidth`, via this component's own
 * `onLayout`) minus the base padding and side insets. Deliberately uses the OPEN state's own
 * (larger) `basePaddingHorizontal`/inset as the reference, not whatever `paddingHorizontal`/
 * `scale` happen to be live-animating through right now: those are `Animated.WithAnimatedValue`s
 * driven off a JS (not native) animation, not plain numbers usable in arithmetic, and the
 * open state reserves the *most* space of any point in the collapse animation - so sizing
 * against it errs toward shrinking the title a touch more than strictly necessary once
 * actually collapsed (which has more room to spare) rather than ever under-shrinking and
 * truncating anyway. `numberOfLines` on `ModuleTitleBarTitle` stays on as a hard backstop
 * below the floor this clamps to (a still-legible ~10px) - a title long enough to still not
 * fit even that small still ellipsizes rather than shrinking into unreadable text.
 */
export const ModuleTitleBar = ({
  fg,
  title,
  displays,
  actions,
  paddingTop,
  paddingBottom,
  paddingHorizontal,
  fontSize,
  barMinHeight,
  scale,
  baseFontSize,
  basePaddingHorizontal,
}: {
  fg: string;
  title: string;
  displays: ReactNode;
  actions: ReactNode;
  paddingTop: Animated.WithAnimatedValue<number>;
  paddingBottom: Animated.WithAnimatedValue<number>;
  paddingHorizontal: Animated.WithAnimatedValue<number>;
  fontSize: Animated.WithAnimatedValue<number>;
  barMinHeight: Animated.WithAnimatedValue<number>;
  scale: Animated.WithAnimatedValue<number>;
  /** The title's font size at collapseAnim=0 (fully open) - the reference size the hidden
   * measuring sibling renders at, see `titleFitScale` above. */
  baseFontSize: number;
  /** The bar's paddingHorizontal at collapseAnim=0 (fully open) - see `titleFitScale` above. */
  basePaddingHorizontal: number;
}) => {
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [naturalTitleWidth, setNaturalTitleWidth] = useState(0);
  // 0 (not the last-measured width) whenever a slot has no content, so a slot that's
  // currently empty never reserves space for content it last had before being cleared.
  const maxSideWidth = Math.max(displays ? leftWidth : 0, actions ? rightWidth : 0);
  // A flat (unscaled) gap on top of the slot's own width, only when a slot is actually
  // present - otherwise a maxed-out title would truncate flush against a chip's edge with
  // zero breathing room, since the title zone's edge and the chip's own box edge would
  // otherwise land at exactly the same point.
  const sideInset = maxSideWidth > 0 ? Animated.add(Animated.multiply(scale, maxSideWidth), 8) : 0;
  const openSideInset = maxSideWidth > 0 ? maxSideWidth + 8 : 0;
  const availableTitleWidth = barWidth > 0 ? barWidth - 2 * basePaddingHorizontal - 2 * openSideInset : 0;
  // Floor is relative to baseFontSize (28), not an absolute scale picked in a vacuum - it's
  // chosen to bottom out around a still-legible ~10px, the smallest size this bar's title
  // ever renders at even for a household name long enough that no realistic bar width could
  // fit it at a larger size without wrapping.
  const titleFitScale =
    availableTitleWidth > 0 && naturalTitleWidth > 0
      ? Math.max(10 / baseFontSize, Math.min(1, availableTitleWidth / naturalTitleWidth))
      : 1;

  return (
    <Animated.View
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        setBarWidth((prev) => (!widthChanged(prev, width) ? prev : width));
      }}
      style={{ paddingTop, paddingBottom, paddingHorizontal, minHeight: barMinHeight, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TitleBarSlot content={displays} scale={scale} onNaturalWidth={setLeftWidth} />
        <View style={{ flex: 1 }} />
        <TitleBarSlot content={actions} scale={scale} onNaturalWidth={setRightWidth} />
      </View>
      {/* Hidden, unscaled sibling measuring how wide the title *wants* to be at the bar's
          base font size - the same "shadow sibling kept entirely out of the box its own
          measurement feeds into" idiom TitleBarSlot uses above (see its own comment for why:
          an in-flow or even absolutely-positioned child measured from inside the box that's
          itself sized off that measurement isn't reliably decoupled from that box's current
          size).

          `aria-hidden` keeps this duplicate copy of the title text out of the
          accessibility tree, so a real screen reader doesn't announce the title twice. RN's
          own `accessibilityElementsHidden`/`importantForAccessibility` props were tried
          first and don't do this on web at all - react-native-web doesn't forward either of
          them to any DOM attribute (confirmed in its source: neither name appears anywhere
          in its `forwardedProps`/`createDOMProps` modules), so they're a native-only no-op
          here; `aria-hidden` is RNW's own explicitly-forwarded prop instead (see its
          `forwardedProps` module), and the one that actually lands in the DOM.

          This does NOT make Playwright's `getByText` stop matching it, though - confirmed
          empirically (it still counted toward `login.spec.ts`'s `getByText('House Hub')`
          strict-mode violation even with `aria-hidden="true"` present). Playwright's text
          locators match on raw text content regardless of `aria-hidden`, `opacity`, or any
          other hidden-from-a11y signal - only `display: none` (which would also zero out
          the very box this element exists to measure) removes an element from matching.
          A Playwright query against a title has to pick the real, visible copy explicitly
          (`.last()` - this shadow copy always renders before it in DOM order, see the
          e2e specs) rather than relying on there being only one match. */}
      <Text
        aria-hidden
        style={{ position: 'absolute', opacity: 0, fontSize: baseFontSize, fontWeight: '700' }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          setNaturalTitleWidth((prev) => (!widthChanged(prev, width) ? prev : width));
        }}
      >
        {title}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: paddingTop,
          bottom: paddingBottom,
          left: Animated.add(paddingHorizontal, sideInset),
          right: Animated.add(paddingHorizontal, sideInset),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ModuleTitleBarTitle fg={fg} title={title} fontSize={Animated.multiply(fontSize, titleFitScale)} />
      </Animated.View>
    </Animated.View>
  );
};
