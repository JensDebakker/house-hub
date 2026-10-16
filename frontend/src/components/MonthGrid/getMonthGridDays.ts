/**
 * Builds the full set of grid cells for a given month, including the leading/trailing days
 * from the adjacent months needed to fill out complete weeks. Relies on the `Date`
 * constructor's own day-overflow/underflow handling (e.g. day `0` rolls back into the
 * previous month) to get month/year rollovers and varying month lengths right without any
 * special-casing - this also handles leap years for free, since `new Date(year, month + 1,
 * 0).getDate()` already returns 29 for a leap February.
 */
export const getMonthGridDays = (year: number, month: number): Date[] => {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + firstWeekday) / 7) * 7;

  const days: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    days.push(new Date(year, month, 1 - firstWeekday + i));
  }
  return days;
};
