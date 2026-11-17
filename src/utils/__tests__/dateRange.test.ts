import { currentMonthRange, monthRangeOffset } from '../dateRange';

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
