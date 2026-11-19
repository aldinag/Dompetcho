import { dueOccurrences } from '../recurringOccurrences';

describe('dueOccurrences — weekly', () => {
  it('returns nothing when the anchor is in the future', () => {
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2026-12-01', lastPostedOn: null },
      new Date(2026, 10, 18),
    );
    expect(result).toEqual([]);
  });

  it('returns the anchor itself as the first occurrence when nothing has posted yet', () => {
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2026-11-04', lastPostedOn: null },
      new Date(2026, 10, 4),
    );
    expect(result).toEqual(['2026-11-04']);
  });

  it('steps by 7 days from the last posted occurrence', () => {
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2026-11-04', lastPostedOn: '2026-11-04' },
      new Date(2026, 10, 25),
    );
    expect(result).toEqual(['2026-11-11', '2026-11-18', '2026-11-25']);
  });

  it('returns nothing due when the next occurrence is still ahead', () => {
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2026-11-04', lastPostedOn: '2026-11-18' },
      new Date(2026, 10, 20),
    );
    expect(result).toEqual([]);
  });

  it('caps a long catch-up run at 12 occurrences', () => {
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2024-01-01', lastPostedOn: null },
      new Date(2026, 10, 18),
    );
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('2024-01-01');
    expect(result[11]).toBe(
      (() => {
        const d = new Date(2024, 0, 1 + 11 * 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
    );
  });

  it('is sensitive to local time near midnight, not UTC', () => {
    // 23:30 local on Nov 4th should still count Nov 4th as "today" for due-ness.
    const lateNight = new Date(2026, 10, 4, 23, 30);
    const result = dueOccurrences(
      { frequency: 'weekly', anchorDate: '2026-11-04', lastPostedOn: null },
      lateNight,
    );
    expect(result).toEqual(['2026-11-04']);
  });
});

describe('dueOccurrences — monthly', () => {
  it('clamps a 31st anchor to the last day of a shorter month', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-01-31', lastPostedOn: '2026-01-31' },
      new Date(2026, 1, 28),
    );
    expect(result).toEqual(['2026-02-28']);
  });

  it('reverts to the 31st once a longer month comes back around', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-01-31', lastPostedOn: '2026-02-28' },
      new Date(2026, 2, 31),
    );
    expect(result).toEqual(['2026-03-31']);
  });

  it('clamps to the 29th in a leap-year February', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2024-01-31', lastPostedOn: '2024-01-31' },
      new Date(2024, 1, 29),
    );
    expect(result).toEqual(['2024-02-29']);
  });

  it('returns nothing when the anchor is in the future', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-12-15', lastPostedOn: null },
      new Date(2026, 10, 18),
    );
    expect(result).toEqual([]);
  });

  it('returns nothing due when the next occurrence is still ahead', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-10-15', lastPostedOn: '2026-11-15' },
      new Date(2026, 11, 1),
    );
    expect(result).toEqual([]);
  });

  it('catches up several missed months in order', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-06-15', lastPostedOn: '2026-06-15' },
      new Date(2026, 10, 18),
    );
    expect(result).toEqual(['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
  });

  it('caps a long catch-up run at 12 occurrences', () => {
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2020-01-31', lastPostedOn: null },
      new Date(2026, 10, 18),
    );
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('2020-01-31');
    expect(result[1]).toBe('2020-02-29'); // 2020 is a leap year
    expect(result[2]).toBe('2020-03-31'); // reverts after the short month
  });

  it('is sensitive to local time near midnight, not UTC', () => {
    const lateNight = new Date(2026, 10, 15, 23, 45);
    const result = dueOccurrences(
      { frequency: 'monthly', anchorDate: '2026-11-15', lastPostedOn: null },
      lateNight,
    );
    expect(result).toEqual(['2026-11-15']);
  });
});
