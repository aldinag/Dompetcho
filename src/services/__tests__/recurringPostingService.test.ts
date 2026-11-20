import { postDueRecurringTransactions } from '../recurringPostingService';
import { createExpense } from '../expenseService';
import { listRecurringTransactions, markRecurringTransactionPosted } from '../recurringService';
import { RecurringTransaction } from '../../types';

jest.mock('../expenseService', () => ({ createExpense: jest.fn() }));
jest.mock('../recurringService', () => ({
  listRecurringTransactions: jest.fn(),
  markRecurringTransactionPosted: jest.fn(),
}));

const mockCreateExpense = createExpense as jest.MockedFunction<typeof createExpense>;
const mockListRecurringTransactions = listRecurringTransactions as jest.MockedFunction<typeof listRecurringTransactions>;
const mockMarkPosted = markRecurringTransactionPosted as jest.MockedFunction<typeof markRecurringTransactionPosted>;

function rule(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: 'r1',
    user_id: 'u1',
    type: 'expense',
    amount: 50_000,
    category_id: 'c1',
    account_id: null,
    note: 'Kos',
    frequency: 'monthly',
    anchor_date: '2026-01-15',
    last_posted_on: null,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const TODAY = new Date(2026, 10, 20); // 20 Nov 2026 (local)

beforeEach(() => {
  jest.resetAllMocks();
  mockMarkPosted.mockResolvedValue(rule());
});

describe('postDueRecurringTransactions', () => {
  it('posts nothing and returns 0 when nothing is due', async () => {
    mockListRecurringTransactions.mockResolvedValue([rule({ anchor_date: '2026-12-01' })]);

    const postedCount = await postDueRecurringTransactions(TODAY);

    expect(postedCount).toBe(0);
    expect(mockCreateExpense).not.toHaveBeenCalled();
    expect(mockMarkPosted).not.toHaveBeenCalled();
  });

  it('skips a paused rule even if it has due occurrences', async () => {
    mockListRecurringTransactions.mockResolvedValue([rule({ is_active: false, anchor_date: '2026-01-15' })]);

    const postedCount = await postDueRecurringTransactions(TODAY);

    expect(postedCount).toBe(0);
    expect(mockCreateExpense).not.toHaveBeenCalled();
  });

  it('posts every due occurrence for one rule and advances last_posted_on to the latest', async () => {
    // Monthly anchor on the 15th, never posted: Jan, Feb, ..., Nov 15 are all due by 20 Nov.
    mockListRecurringTransactions.mockResolvedValue([rule({ anchor_date: '2026-01-15', last_posted_on: null })]);
    mockCreateExpense.mockResolvedValue({} as any);

    const postedCount = await postDueRecurringTransactions(TODAY);

    expect(postedCount).toBe(11); // Jan through Nov
    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        amount: 50_000,
        categoryId: 'c1',
        note: 'Kos',
        source: 'recurring',
        type: 'expense',
        recurringId: 'r1',
        occurrenceDate: '2026-01-15',
      }),
    );
    expect(mockMarkPosted).toHaveBeenCalledWith('r1', '2026-11-15');
  });

  it('treats a unique-violation as already posted and keeps going', async () => {
    mockListRecurringTransactions.mockResolvedValue([
      rule({ frequency: 'weekly', anchor_date: '2026-11-04', last_posted_on: null }),
    ]);
    // Weekly from 2026-11-04: 11-04, 11-11, 11-18 are all due by 2026-11-20. The first was
    // already posted by another device/run; the other two should count as newly inserted.
    mockCreateExpense.mockRejectedValueOnce({ code: '23505' }).mockResolvedValue({} as any);

    const postedCount = await postDueRecurringTransactions(TODAY);

    expect(postedCount).toBe(2);
    expect(mockCreateExpense).toHaveBeenCalledTimes(3);
    expect(mockMarkPosted).toHaveBeenCalledWith('r1', '2026-11-18');
  });

  it('skips a rule that fails for a real error, without blocking the other rules', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockListRecurringTransactions.mockResolvedValue([
      rule({ id: 'broken', anchor_date: '2026-11-01', frequency: 'weekly', last_posted_on: null }),
      rule({ id: 'fine', anchor_date: '2026-11-01', frequency: 'weekly', last_posted_on: null }),
    ]);
    mockCreateExpense.mockImplementation(async input => {
      if (input.recurringId === 'broken') throw new Error('relation "public.expenses" does not exist');
      return {} as any;
    });

    const postedCount = await postDueRecurringTransactions(TODAY);

    // "broken" aborts on its very first occurrence and is skipped entirely; "fine"'s three
    // weekly occurrences (11-01, 11-08, 11-15) still post normally.
    expect(postedCount).toBe(3);
    expect(mockMarkPosted).toHaveBeenCalledTimes(1);
    expect(mockMarkPosted).toHaveBeenCalledWith('fine', '2026-11-15');
  });
});
