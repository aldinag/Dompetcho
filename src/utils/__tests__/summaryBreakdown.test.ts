import { MonthlyExpenseBreakdown } from '../../services/expenseService';
import { buildMonthSections } from '../summaryBreakdown';

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

// Finest-grain RPC rows: Food was paid from two accounts, Transport from one, plus an older
// month and an untagged/uncategorized expense.
const ROWS: MonthlyExpenseBreakdown[] = [
  row({ categoryId: 'cat-food', categoryName: 'Food', accountId: 'acc-bca', accountName: 'BCA', amount: 30_000 }),
  row({ categoryId: 'cat-food', categoryName: 'Food', accountId: 'acc-gopay', accountName: 'GoPay', amount: 25_000 }),
  row({ categoryId: 'cat-trans', categoryName: 'Transport', accountId: 'acc-gopay', accountName: 'GoPay', amount: 40_000 }),
  row({ categoryId: null, categoryName: null, accountId: null, accountName: null, amount: 5_000 }),
  row({ monthKey: '2026-10', amount: 7_000 }),
];

describe('buildMonthSections', () => {
  it('keeps months in the RPC order (newest first) with correct totals', () => {
    const sections = buildMonthSections(ROWS, 'category');

    expect(sections.map(s => s.key)).toEqual(['2026-11', '2026-10']);
    expect(sections[0].total).toBe(100_000);
    expect(sections[1].total).toBe(7_000);
  });

  it('collapses account splits into one row per category, largest first', () => {
    const [nov] = buildMonthSections(ROWS, 'category');

    expect(nov.data.map(r => [r.id, r.amount])).toEqual([
      ['cat-food', 55_000], // 30_000 BCA + 25_000 GoPay
      ['cat-trans', 40_000],
      ['uncategorized', 5_000],
    ]);
  });

  it('collapses category splits into one row per account, largest first', () => {
    const [nov] = buildMonthSections(ROWS, 'account');

    expect(nov.data.map(r => [r.id, r.label, r.amount])).toEqual([
      ['acc-gopay', 'GoPay', 65_000], // 25_000 Food + 40_000 Transport
      ['acc-bca', 'BCA', 30_000],
      ['untagged', 'Tanpa Akun', 5_000],
    ]);
  });

  it('gives the same month total in both modes', () => {
    const byCategory = buildMonthSections(ROWS, 'category').map(s => s.total);
    const byAccount = buildMonthSections(ROWS, 'account').map(s => s.total);

    expect(byAccount).toEqual(byCategory);
  });

  it('only shows icons for categories, not accounts', () => {
    expect(buildMonthSections(ROWS, 'category')[0].data.every(r => r.icon)).toBe(true);
    expect(buildMonthSections(ROWS, 'account')[0].data.some(r => r.icon)).toBe(false);
  });

  it('returns no sections for no rows', () => {
    expect(buildMonthSections([], 'category')).toEqual([]);
  });
});
