/**
 * Shared styling for the house-hub form screens (auth + house create/join/leave): these
 * all use the same bordered text input and a solid, centered action button that differs
 * only by its accent color per screen.
 */
export const inputStyle = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
};

/** Base look for a full-width action button; `buttonStyle(color)` fills in the one thing
 * that actually varies per screen - its background color. */
export function buttonStyle(backgroundColor: string) {
  return {
    backgroundColor,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center' as const,
  };
}
