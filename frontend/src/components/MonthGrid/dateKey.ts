/** Formats a Date as a `YYYY-MM-DD` key using its *local* calendar fields (not UTC), so a
 * day bucket matches what the user sees on the grid regardless of their timezone offset
 * relative to the event's stored UTC instant. */
export const dateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
