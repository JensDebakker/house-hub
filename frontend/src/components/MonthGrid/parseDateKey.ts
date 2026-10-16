const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a `YYYY-MM-DD` key as local midnight (the `dateKey` inverse) rather than via the
 * `Date` constructor's own date-only-string parsing, which treats it as UTC midnight and
 * shifts the day by one for anyone west of UTC. Falls back to the built-in parser for any
 * other format, since the date field this feeds is free text, not restricted to this shape. */
export const parseDateKey = (value: string): Date => {
  const match = value.match(DATE_KEY_PATTERN);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};
