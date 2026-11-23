import { Account, Category, Expense } from '../../types';
import { pickExpenseFormDefaults } from '../expenseFormDefaults';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    amount: 10_000,
    category_id: 'cat-food',
    account_id: 'acc-cash',
    note: null,
    date: '2026-11-05T12:00:00.000Z',
    source: 'manual',
    type: 'expense',
    recurring_id: null,
    occurrence_date: null,
    created_at: '2026-11-05T12:00:00.000Z',
    ...overrides,
  };
}

function category(overrides: Partial<Category> = {}): Category {
  return { id: 'cat-food', user_id: 'user-1', name: 'food', icon: 'food', is_default: true, ...overrides };
}

function account(overrides: Partial<Account> = {}): Account {
  return { id: 'acc-cash', user_id: 'user-1', name: 'Cash', kind: 'cash', created_at: '2026-01-01T00:00:00.000Z', ...overrides };
}

describe('pickExpenseFormDefaults', () => {
  it('falls back to blank defaults with no history', () => {
    expect(pickExpenseFormDefaults([], [category()], [account()])).toEqual({
      categoryId: null,
      accountId: null,
      type: 'expense',
    });
  });

  it('defaults to the latest expense\'s category, account and type', () => {
    const result = pickExpenseFormDefaults(
      [expense({ category_id: 'cat-food', account_id: 'acc-cash', type: 'income' })],
      [category()],
      [account()],
    );
    expect(result).toEqual({ categoryId: 'cat-food', accountId: 'acc-cash', type: 'income' });
  });

  it('picks the chronologically latest expense regardless of array order', () => {
    const older = expense({ id: 'a', date: '2026-11-01T00:00:00.000Z', category_id: 'cat-old' });
    const newer = expense({ id: 'b', date: '2026-11-10T00:00:00.000Z', category_id: 'cat-new' });
    const result = pickExpenseFormDefaults([older, newer], [category({ id: 'cat-new' })], []);
    expect(result.categoryId).toBe('cat-new');
  });

  it('breaks a same-date tie with created_at', () => {
    const first = expense({ id: 'a', date: '2026-11-05T12:00:00.000Z', created_at: '2026-11-05T12:00:00.000Z', category_id: 'cat-first' });
    const second = expense({ id: 'b', date: '2026-11-05T12:00:00.000Z', created_at: '2026-11-05T12:05:00.000Z', category_id: 'cat-second' });
    const result = pickExpenseFormDefaults([first, second], [category({ id: 'cat-second' })], []);
    expect(result.categoryId).toBe('cat-second');
  });

  it('leaves category null when the latest expense had none', () => {
    const result = pickExpenseFormDefaults([expense({ category_id: null })], [category()], [account()]);
    expect(result.categoryId).toBeNull();
  });

  it('leaves account null when the latest expense had none', () => {
    const result = pickExpenseFormDefaults([expense({ account_id: null })], [category()], [account()]);
    expect(result.accountId).toBeNull();
  });

  it('drops a category that was since deleted', () => {
    const result = pickExpenseFormDefaults([expense({ category_id: 'cat-deleted' })], [category({ id: 'cat-food' })], [account()]);
    expect(result.categoryId).toBeNull();
  });

  it('drops an account that was since deleted', () => {
    const result = pickExpenseFormDefaults([expense({ account_id: 'acc-deleted' })], [category()], [account({ id: 'acc-cash' })]);
    expect(result.accountId).toBeNull();
  });
});
