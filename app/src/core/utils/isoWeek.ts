/**
 * ISO week start (Monday-start, local timezone)
 *
 * Returns the YYYY-MM-DD string of the Monday that begins the ISO week
 * containing the given date. Matches the codebase's existing local-tz
 * date convention (see `getTodayString` in stoicPracticeStore).
 */
export function getIsoWeekStart(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  const day = date.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // shift to current Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}
