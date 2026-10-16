import { useState, type ReactNode } from 'react';
import { Animated, Pressable, View } from 'react-native';

/**
 * A title-bar display or action slot. `transform: scale` (used to visually shrink this
 * alongside the title as a module collapses) never shrinks an element's own contribution to
 * its parent's layout - that's true in CSS and in React Native's Yoga layout engine alike,
 * since transforms are purely a paint-time effect. Left alone, that means the header row
 * would keep reserving this slot's full, unscaled size even while it's rendered visually
 * smaller - wasted invisible height that stops the title bar from ever getting as short as it
 * looks, which in turn stops a nested module from rising to fully occupy the space that
 * shrinking the title (and this slot) was supposed to free up.
 *
 * Fixed by measuring the slot's natural (pre-transform) size via a hidden, unscaled shadow
 * copy, then explicitly sizing the real (visible) wrapper to `naturalSize * scale` with
 * `overflow: hidden`. That visible box now actually shrinks in lockstep with the visual
 * scale, so the row's real reserved height tracks what's on screen.
 *
 * The shadow copy has to be a sibling kept entirely out of the shrinking box, not nested
 * inside it - an in-flow child measured from inside a box that's itself sized off that same
 * measurement creates a feedback loop (each pass's smaller box constrains the child's own
 * layout width, which re-fires onLayout with an even smaller size, shrinking the box
 * further, converging to zero) and even `position: 'absolute'` on that child isn't a full
 * fix: Yoga's auto-sizing for an absolutely-positioned child isn't fully decoupled from its
 * positioned ancestor's current size either, which under-measures and clips real content
 * (confirmed: "1 online" was rendering as "1 o" once the row had fully collapsed, from a
 * slightly-too-small reserved box). A sibling that the shrinking box's own size can never
 * feed back into has no such loop to fall into.
 */
export const TitleBarSlot = ({
  content,
  scale,
  onNaturalWidth,
}: {
  content: ReactNode;
  scale: Animated.WithAnimatedValue<number>;
  /** Reports this slot's natural (pre-scale) width up to `ModuleTitleBar`, so it can keep
   * the centered title's own box from ever overlapping either slot - see there. */
  onNaturalWidth?: (width: number) => void;
}) => {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  if (!content) return null;

  // Swallows taps so they don't fall through to whatever Pressable wraps the whole header
  // (the collapsed frame's tap-to-go-back, or a tile's tap-to-open) - the same idiom already
  // used elsewhere for a collapsed frame's nested child.
  const inner = (
    <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {content}
    </Pressable>
  );

  return (
    <>
      <View
        style={{ position: 'absolute', opacity: 0 }}
        pointerEvents="none"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setNaturalSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
          onNaturalWidth?.(width);
        }}
      >
        {inner}
      </View>
      <Animated.View
        style={{
          width: naturalSize ? Animated.multiply(scale, naturalSize.width) : undefined,
          height: naturalSize ? Animated.multiply(scale, naturalSize.height) : undefined,
          overflow: 'hidden',
        }}
      >
        {/* No maxWidth cap here (tried once, reverted): it constrains this box to less than
            the visible inner's natural size whenever content is wide enough to need it, and
            the visible inner is a normal in-flow child of this box (unlike the measuring
            copy above, which is an out-of-flow sibling specifically so it's immune to this) -
            so capping this box also squeezes the inner's own layout width, wrapping/clipping
            real content instead of cleanly cropping it. Confirmed: the online badge started
            getting cut off on its right and bottom edges under real use.

            transformOrigin is 'left top' rather than the RN default (center): `scale`
            shrinks `inner` around whatever point transformOrigin names, but the outer box
            above is sized and positioned as a LEFT/TOP-anchored footprint
            (`naturalSize * scale`, flush against this slot's own top-left corner in the
            row). Scaling around the center would shrink inner toward the midpoint of its
            full natural-size box instead of toward that corner, so the visible (post-scale)
            content drifts away from the outer box's actual bounds as scale shrinks - exactly
            the clipped-pill-with-a-gap-beside-it seen in production (right and bottom edges
            cut off, since the content overshoots the box on those sides while the top/left
            seem fine only by coincidence of having nowhere to drift past 0). Anchoring the
            scale at the same corner the outer box is anchored at keeps the visible content
            exactly filling the outer box at every point in the animation, left slot or right
            slot alike. */}
        <Animated.View style={{ transform: [{ scale }], transformOrigin: 'left top' }}>{inner}</Animated.View>
      </Animated.View>
    </>
  );
};
