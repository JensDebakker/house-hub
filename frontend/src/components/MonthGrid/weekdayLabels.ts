// A known Sunday (2023-01-01) used purely to read locale-appropriate short weekday labels
// in Sun..Sat order, without hardcoding English names.
export const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) =>
  new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
);
