import { calculateBalance } from '../balance';

describe('calculateBalance', () => {
  it('nets income and expense across every record, not just the current month', () => {
    const expenses = [
      { type: 'income' as const, amount: 5_000_000 }, // e.g. salary received last month
      { type: 'expense' as const, amount: 1_200_000 }, // last month's rent
      { type: 'expense' as const, amount: 50_000 }, // this month's groceries
    ];
    expect(calculateBalance(expenses)).toBe(5_000_000 - 1_200_000 - 50_000);
  });

  it('returns 0 for no expenses', () => {
    expect(calculateBalance([])).toBe(0);
  });

  it('goes negative when expenses exceed income', () => {
    const expenses = [
      { type: 'income' as const, amount: 100_000 },
      { type: 'expense' as const, amount: 150_000 },
    ];
    expect(calculateBalance(expenses)).toBe(-50_000);
  });
});
