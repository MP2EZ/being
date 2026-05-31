import { getIsoWeekStart } from '@/core/utils/isoWeek';

describe('getIsoWeekStart', () => {
  it('returns the same date when called on a Monday at midnight', () => {
    // 2026-05-25 is a Monday
    expect(getIsoWeekStart(new Date(2026, 4, 25, 0, 0, 0))).toBe('2026-05-25');
  });

  it('returns the same Monday when called mid-week (Wednesday midday)', () => {
    // 2026-05-27 is a Wednesday; week starts 2026-05-25
    expect(getIsoWeekStart(new Date(2026, 4, 27, 12, 30, 0))).toBe('2026-05-25');
  });

  it('returns the prior Monday when called on a Sunday at 23:59', () => {
    // 2026-05-31 is a Sunday; week starts 2026-05-25 (Monday-start convention)
    expect(getIsoWeekStart(new Date(2026, 4, 31, 23, 59, 0))).toBe('2026-05-25');
  });

  it('returns the prior Monday when called on a Saturday', () => {
    // 2026-05-30 is a Saturday; week starts 2026-05-25
    expect(getIsoWeekStart(new Date(2026, 4, 30, 9, 0, 0))).toBe('2026-05-25');
  });

  it('handles year rollover (Wednesday 2025-01-01)', () => {
    // 2025-01-01 was a Wednesday; week starts Monday 2024-12-30
    expect(getIsoWeekStart(new Date(2025, 0, 1, 12, 0, 0))).toBe('2024-12-30');
  });

  it('handles leap-year February boundary', () => {
    // 2024-02-29 was a Thursday; week starts Monday 2024-02-26
    expect(getIsoWeekStart(new Date(2024, 1, 29, 8, 0, 0))).toBe('2024-02-26');
  });

  it('uses current date when called without an argument', () => {
    const result = getIsoWeekStart();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not mutate the input Date', () => {
    const input = new Date(2026, 4, 27, 12, 30, 0);
    const before = input.getTime();
    getIsoWeekStart(input);
    expect(input.getTime()).toBe(before);
  });
});
