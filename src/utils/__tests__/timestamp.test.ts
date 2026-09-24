import { localDayKey, localMonthKey, timestampFromLocal, withPickedDay } from '../timestamp';

describe('timestamp helpers', () => {
  it('keeps the local calendar day for a receipt date/time (the WIB early-morning case)', () => {
    const ts = timestampFromLocal('2026-09-01', '00:30');
    expect(localDayKey(ts)).toBe('2026-09-01');
    expect(localMonthKey(ts)).toBe('2026-09');
  });

  it('defaults a receipt with no time to noon on its day', () => {
    expect(localDayKey(timestampFromLocal('2026-08-31', null))).toBe('2026-08-31');
  });

  it('moves to the picked day but keeps the time of day', () => {
    const base = timestampFromLocal('2026-09-21', '06:15');
    const moved = withPickedDay(base, new Date(2026, 7, 31));
    expect(localDayKey(moved)).toBe('2026-08-31');
    expect(new Date(moved).getHours()).toBe(6);
    expect(new Date(moved).getMinutes()).toBe(15);
  });
});
