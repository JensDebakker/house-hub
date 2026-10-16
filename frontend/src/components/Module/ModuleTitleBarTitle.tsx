import { Animated } from 'react-native';

/** The title text itself, factored out of `ModuleTitleBar` so the bar's layout and the
 * title's own styling are two separate concerns. Purely presentational - all the sizing it
 * needs (font size, color) comes from the bar around it.
 *
 * `numberOfLines={1}` stays on as a backstop (so a title so long even the minimum font
 * scale in `ModuleTitleBar` can't save it still ellipsizes instead of wrapping into a
 * second line and blowing out the bar's reserved height), but it's no longer the primary
 * way a narrow bar copes with a long title - `ModuleTitleBar` measures how wide this text
 * *wants* to be (via a hidden sibling, not this element itself - see there) and shrinks
 * `fontSize` to fit instead, matching the expectation that the whole bar (badges included)
 * shrinks together rather than the title alone getting clipped. */
export const ModuleTitleBarTitle = ({
  fg,
  title,
  fontSize,
}: {
  fg: string;
  title: string;
  fontSize: Animated.WithAnimatedValue<number>;
}) => (
  <Animated.Text numberOfLines={1} style={{ fontSize, fontWeight: '700', color: fg, textAlign: 'center' }}>
    {title}
  </Animated.Text>
);
