/**
 * @jest-environment <rootDir>/src/testEnvironments/jakartaEnvironment.js
 */
import { Expense } from '../../types';
import { groupByDay } from '../groupExpenses';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    amount: 10_000,
    category_id: 'cat-food',
    account_id: null,
    note: null,
    date: '2026-11-05T12:00:00.000Z',
    source: 'manual',
    type: 'expense',
    created_at: '2026-11-05T12:00:00.000Z',
    ...overrides,
  };
}

describe('groupByDay', () => {
  it('groups a late-night UTC timestamp under the next local day in a non-UTC timezone (WIB)', () => {
    // This file runs under the Asia/Jakarta (UTC+7) test environment — see its docblock above.
    // 23:30 UTC on Nov 4 is 06:30 WIB on Nov 5 — must land on the Nov 5 bucket, not Nov 4.
    const sections = groupByDay([expense({ id: 'a', date: '2026-11-04T23:30:00.000Z' })]);

    expect(sections).toHaveLength(1);
    expect(sections[0].isoDate).toBe('2026-11-05');
  });

  it('keeps sections in first-seen order, not sorted by date', () => {
    const sections = groupByDay([
      expense({ id: 'a', date: '2026-11-05T08:00:00.000Z' }),
      expense({ id: 'b', date: '2026-11-03T08:00:00.000Z' }),
      expense({ id: 'c', date: '2026-11-05T09:00:00.000Z' }),
    ]);

    expect(sections.map(s => s.isoDate)).toEqual(['2026-11-05', '2026-11-03']);
    expect(sections[0].data.map(e => e.id)).toEqual(['a', 'c']);
    expect(sections[1].data.map(e => e.id)).toEqual(['b']);
  });

  it('groups uncategorized expenses the same as categorized ones', () => {
    const sections = groupByDay([
      expense({ id: 'a', category_id: null, date: '2026-11-05T08:00:00.000Z' }),
      expense({ id: 'b', category_id: 'cat-food', date: '2026-11-05T09:00:00.000Z' }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].data.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('nets income and expense into one subtotal per day — expense subtracts, income adds', () => {
    const sections = groupByDay([
      expense({ id: 'a', type: 'expense', amount: 30_000, date: '2026-11-05T08:00:00.000Z' }),
      expense({ id: 'b', type: 'income', amount: 100_000, date: '2026-11-05T09:00:00.000Z' }),
    ]);

    expect(sections[0].subtotal).toBe(70_000);
  });

  it('returns no sections for no expenses', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
