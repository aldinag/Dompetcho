import { MonthlyExpenseBreakdown } from '../../services/expenseService';
import {
  formatCategoryDeltaLabel,
  formatMonthDeltaLabel,
  monthCategoryDeltas,
  monthTotalDelta,
} from '../monthComparison';

function row(overrides: Partial<MonthlyExpenseBreakdown> = {}): MonthlyExpenseBreakdown {
  return {
    monthKey: '2026-11',
    categoryId: 'cat-food',
    categoryName: 'Food',
    accountId: 'acc-bca',
    accountName: 'BCA',
    amount: 10_000,
    ...overrides,
  };
}

describe('monthTotalDelta', () => {
  it('returns null when the previous calendar month has no rows at all', () => {
    const rows = [row({ monthKey: '2026-11', amount: 50_000 })];

    expect(monthTotalDelta(rows, '2026-11')).toBeNull();
  });

  it('is not fooled by an older month that is not the immediately preceding one', () => {
    const rows = [row({ monthKey: '2026-11', amount: 50_000 }), row({ monthKey: '2026-09', amount: 20_000 })];

    expect(monthTotalDelta(rows, '2026-11')).toBeNull();
  });

  it('reports "more" (boros) when spending went up, with correct totals', () => {
    const rows = [
      row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 150_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-food', amount: 30_000 }),
    ];

    expect(monthTotalDelta(rows, '2026-11')).toEqual({
      currentTotal: 150_000,
      previousTotal: 30_000,
      deltaAmount: 120_000,
      direction: 'more',
    });
  });

  it('reports "less" (hemat) when spending went down', () => {
    const rows = [
      row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 10_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-food', amount: 260_000 }),
    ];

    expect(monthTotalDelta(rows, '2026-11')).toEqual({
      currentTotal: 10_000,
      previousTotal: 260_000,
      deltaAmount: -250_000,
      direction: 'less',
    });
  });

  it('reports "same" when both months total the same amount', () => {
    const rows = [row({ monthKey: '2026-11', amount: 40_000 }), row({ monthKey: '2026-10', amount: 40_000 })];

    expect(monthTotalDelta(rows, '2026-11')?.direction).toBe('same');
  });

  it('handles a zero previous total without crashing, as a full "more" delta', () => {
    // A zero-amount row shouldn't occur in real data (schema enforces amount > 0), but the
    // previous month still counts as "has data" since a row for it exists at all.
    const rows = [row({ monthKey: '2026-11', amount: 75_000 }), row({ monthKey: '2026-10', amount: 0 })];

    expect(monthTotalDelta(rows, '2026-11')).toEqual({
      currentTotal: 75_000,
      previousTotal: 0,
      deltaAmount: 75_000,
      direction: 'more',
    });
  });

  it('only ever sums expense rows, since breakdownRows never carries income', () => {
    // getExpenseBreakdownByMonth's RPC already excludes income (see its doc comment) — this
    // fixture mixes several categories across both months to confirm the total is exactly the
    // sum of the given (expense-only) rows, with nothing silently added or dropped.
    const rows = [
      row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 60_000 }),
      row({ monthKey: '2026-11', categoryId: 'cat-trans', amount: 15_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-food', amount: 20_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-trans', amount: 5_000 }),
    ];

    const delta = monthTotalDelta(rows, '2026-11')!;
    expect(delta.currentTotal).toBe(75_000);
    expect(delta.previousTotal).toBe(25_000);
  });
});

describe('formatMonthDeltaLabel', () => {
  it('formats "more" in boros wording', () => {
    expect(formatMonthDeltaLabel({ currentTotal: 150_000, previousTotal: 30_000, deltaAmount: 120_000, direction: 'more' }))
      .toBe('Rp 120.000 lebih boros dari bulan lalu');
  });

  it('formats "less" in hemat wording', () => {
    expect(formatMonthDeltaLabel({ currentTotal: 10_000, previousTotal: 260_000, deltaAmount: -250_000, direction: 'less' }))
      .toBe('Rp 250.000 lebih hemat dari bulan lalu');
  });

  it('formats "same"', () => {
    expect(formatMonthDeltaLabel({ currentTotal: 40_000, previousTotal: 40_000, deltaAmount: 0, direction: 'same' }))
      .toBe('Sama dengan bulan lalu');
  });
});

describe('monthCategoryDeltas', () => {
  it('is empty when there is no previous month to compare against', () => {
    const rows = [row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 50_000 })];

    expect(monthCategoryDeltas(rows, '2026-11').size).toBe(0);
  });

  it('treats a category missing from the previous month as having spent 0 then', () => {
    const rows = [
      row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 40_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-trans', amount: 15_000 }), // different category
    ];

    const deltas = monthCategoryDeltas(rows, '2026-11');
    expect(deltas.get('cat-food')).toEqual({ categoryId: 'cat-food', deltaAmount: 40_000, direction: 'more' });
  });

  it('computes a per-category delta when the category appears in both months', () => {
    const rows = [
      row({ monthKey: '2026-11', categoryId: 'cat-food', amount: 90_000 }),
      row({ monthKey: '2026-10', categoryId: 'cat-food', amount: 100_000 }),
    ];

    const deltas = monthCategoryDeltas(rows, '2026-11');
    expect(deltas.get('cat-food')).toEqual({ categoryId: 'cat-food', deltaAmount: -10_000, direction: 'less' });
  });

  it('uses the "uncategorized" sentinel, matching summaryBreakdown.ts', () => {
    const rows = [
      row({ monthKey: '2026-11', categoryId: null, categoryName: null, amount: 20_000 }),
      row({ monthKey: '2026-10', categoryId: null, categoryName: null, amount: 5_000 }),
    ];

    const deltas = monthCategoryDeltas(rows, '2026-11');
    expect(deltas.get('uncategorized')).toEqual({ categoryId: 'uncategorized', deltaAmount: 15_000, direction: 'more' });
  });
});

describe('formatCategoryDeltaLabel', () => {
  it('prefixes a "more" delta with +', () => {
    expect(formatCategoryDeltaLabel({ categoryId: 'cat-food', deltaAmount: 20_000, direction: 'more' })).toBe('+Rp 20.000');
  });

  it('prefixes a "less" delta with -', () => {
    expect(formatCategoryDeltaLabel({ categoryId: 'cat-food', deltaAmount: -15_000, direction: 'less' })).toBe('-Rp 15.000');
  });

  it('shows "Sama" for no change', () => {
    expect(formatCategoryDeltaLabel({ categoryId: 'cat-food', deltaAmount: 0, direction: 'same' })).toBe('Sama');
  });
});
