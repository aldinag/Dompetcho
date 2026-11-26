import { currentMonthRange, monthRangeFromKey, monthRangeOffset } from '../dateRange';

describe('monthRangeOffset', () => {
  it('returns the same range as currentMonthRange for offset 0', () => {
    expect(monthRangeOffset(0)).toEqual(currentMonthRange());
  });

  it('steps back whole calendar months, not just 30-day chunks', () => {
    const current = monthRangeOffset(0);
    const previous = monthRangeOffset(1);

    expect(previous.end).toBe(current.start);
    expect(new Date(previous.start).getDate()).toBe(1);
  });

  it('crosses a year boundary correctly', () => {
    const now = new Date();
    const monthsIntoYear = now.getMonth(); // 0 = January
    const previous = monthRangeOffset(monthsIntoYear + 1);

    expect(new Date(previous.start).getFullYear()).toBe(now.getFullYear() - 1);
    expect(new Date(previous.start).getMonth()).toBe(11);
  });
});

describe('monthRangeFromKey', () => {
  it('parses a "YYYY-MM" key into that calendar month, local time', () => {
    const range = monthRangeFromKey('2026-09');

    expect(new Date(range.start)).toEqual(new Date(2026, 8, 1));
    expect(new Date(range.end)).toEqual(new Date(2026, 9, 1));
  });

  it('crosses a year boundary for December', () => {
    const range = monthRangeFromKey('2025-12');

    expect(new Date(range.start)).toEqual(new Date(2025, 11, 1));
    expect(new Date(range.end)).toEqual(new Date(2026, 0, 1));
  });
});
