import { useExpenseStore, EXPENSES_PAGE_SIZE } from '../useExpenseStore';
import { listAccounts } from '../../services/accountService';
import { listCategories } from '../../services/categoryService';
import { getExpenseTotals, listExpenses } from '../../services/expenseService';
import { Category, Expense } from '../../types';

// Explicit factories (not bare `jest.mock(path)`) so the real modules — which pull in
// `../../lib/supabase` and its native/polyfill imports — are never required by Jest just to
// build an automock.
jest.mock('../../services/accountService', () => ({
  listAccounts: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
}));
jest.mock('../../services/categoryService', () => ({ listCategories: jest.fn() }));
jest.mock('../../services/expenseService', () => ({ listExpenses: jest.fn(), getExpenseTotals: jest.fn() }));

const mockListExpenses = listExpenses as jest.MockedFunction<typeof listExpenses>;
const mockListCategories = listCategories as jest.MockedFunction<typeof listCategories>;
const mockListAccounts = listAccounts as jest.MockedFunction<typeof listAccounts>;
const mockGetExpenseTotals = getExpenseTotals as jest.MockedFunction<typeof getExpenseTotals>;

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    user_id: 'u1',
    amount: 10_000,
    category_id: null,
    account_id: null,
    note: null,
    date: new Date().toISOString(), // "this month" by default
    source: 'manual',
    type: 'expense',
    created_at: new Date().toISOString(),
    category: null,
    ...overrides,
  };
}

const FAKE_EXPENSE = expense();
const FAKE_CATEGORY = { id: 'c1' } as Category;
const ZERO_TOTALS = { balance: 0, monthIncome: 0, monthExpense: 0 };

beforeEach(() => {
  jest.resetAllMocks();
  mockGetExpenseTotals.mockResolvedValue(ZERO_TOTALS);
  useExpenseStore.setState({
    expenses: [],
    hasMoreExpenses: false,
    loadingMoreExpenses: false,
    searchQuery: '',
    categoryFilterId: null,
    filtering: false,
    balance: 0,
    monthIncome: 0,
    monthExpense: 0,
    categories: [],
    accounts: [],
    loading: false,
    refreshing: false,
    error: null,
    isOffline: false,
  });
});

describe('useExpenseStore.loadInitial', () => {
  it('keeps expenses and categories that loaded fine even when accounts fails', async () => {
    mockListExpenses.mockResolvedValue([FAKE_EXPENSE]);
    mockListCategories.mockResolvedValue([FAKE_CATEGORY]);
    mockListAccounts.mockRejectedValue(new Error('relation "public.accounts" does not exist'));

    await expect(useExpenseStore.getState().loadInitial()).rejects.toThrow();

    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([FAKE_EXPENSE]);
    expect(state.categories).toEqual([FAKE_CATEGORY]);
    expect(state.accounts).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('sets expenses, categories, accounts and totals when every fetch succeeds', async () => {
    mockListExpenses.mockResolvedValue([FAKE_EXPENSE]);
    mockListCategories.mockResolvedValue([FAKE_CATEGORY]);
    mockListAccounts.mockResolvedValue([]);
    mockGetExpenseTotals.mockResolvedValue({ balance: 123, monthIncome: 456, monthExpense: 789 });

    await useExpenseStore.getState().loadInitial();

    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([FAKE_EXPENSE]);
    expect(state.categories).toEqual([FAKE_CATEGORY]);
    expect(state.balance).toBe(123);
    expect(state.monthIncome).toBe(456);
    expect(state.monthExpense).toBe(789);
  });

  it('requests the first page with the page-size limit, not every expense', async () => {
    mockListExpenses.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([]);
    mockListAccounts.mockResolvedValue([]);

    await useExpenseStore.getState().loadInitial();

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE });
  });

  it('marks hasMoreExpenses when the first page comes back full', async () => {
    const fullPage = Array.from({ length: EXPENSES_PAGE_SIZE }, (_, i) => expense({ id: `e${i}` }));
    mockListExpenses.mockResolvedValue(fullPage);
    mockListCategories.mockResolvedValue([]);
    mockListAccounts.mockResolvedValue([]);

    await useExpenseStore.getState().loadInitial();

    expect(useExpenseStore.getState().hasMoreExpenses).toBe(true);
  });
});

describe('useExpenseStore error / retry', () => {
  it('records a network error from loadInitial and clears it once a retry succeeds', async () => {
    mockListExpenses.mockRejectedValueOnce(new TypeError('Network request failed'));
    mockListCategories.mockResolvedValue([]);
    mockListAccounts.mockResolvedValue([]);

    await expect(useExpenseStore.getState().loadInitial()).rejects.toThrow('Network request failed');

    let state = useExpenseStore.getState();
    expect(state.error).toBe('Network request failed');
    expect(state.isOffline).toBe(true);

    mockListExpenses.mockResolvedValueOnce([FAKE_EXPENSE]);
    await useExpenseStore.getState().loadInitial();

    state = useExpenseStore.getState();
    expect(state.error).toBeNull();
    expect(state.isOffline).toBe(false);
    expect(state.expenses).toEqual([FAKE_EXPENSE]);
  });

  it('records a non-network error from loadInitial without marking it offline', async () => {
    mockListExpenses.mockRejectedValueOnce(new Error('relation "public.expenses" does not exist'));
    mockListCategories.mockResolvedValue([]);
    mockListAccounts.mockResolvedValue([]);

    await expect(useExpenseStore.getState().loadInitial()).rejects.toThrow();

    const state = useExpenseStore.getState();
    expect(state.error).toBe('relation "public.expenses" does not exist');
    expect(state.isOffline).toBe(false);
  });

  it('records and then clears an error from a failed refresh', async () => {
    useExpenseStore.setState({ expenses: [FAKE_EXPENSE] });
    mockListExpenses.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(useExpenseStore.getState().refresh()).rejects.toThrow();
    expect(useExpenseStore.getState().error).toBe('Network request failed');
    expect(useExpenseStore.getState().isOffline).toBe(true);
    // A failed refresh must not wipe what was already on screen.
    expect(useExpenseStore.getState().expenses).toEqual([FAKE_EXPENSE]);

    mockListExpenses.mockResolvedValueOnce([FAKE_EXPENSE]);
    await useExpenseStore.getState().refresh();
    expect(useExpenseStore.getState().error).toBeNull();
    expect(useExpenseStore.getState().isOffline).toBe(false);
  });

  it('records an error from a failed loadMoreExpenses, keeping hasMoreExpenses so retry can run again', async () => {
    useExpenseStore.setState({ expenses: [FAKE_EXPENSE], hasMoreExpenses: true });
    mockListExpenses.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(useExpenseStore.getState().loadMoreExpenses()).rejects.toThrow();

    let state = useExpenseStore.getState();
    expect(state.error).toBe('Network request failed');
    expect(state.isOffline).toBe(true);
    expect(state.hasMoreExpenses).toBe(true);
    expect(state.expenses).toEqual([FAKE_EXPENSE]);

    const nextPage = [expense({ id: 'e2' })];
    mockListExpenses.mockResolvedValueOnce(nextPage);
    await useExpenseStore.getState().loadMoreExpenses();

    state = useExpenseStore.getState();
    expect(state.error).toBeNull();
    expect(state.isOffline).toBe(false);
    expect(state.expenses).toEqual([FAKE_EXPENSE, ...nextPage]);
  });
});

describe('useExpenseStore.loadMoreExpenses', () => {
  it('appends the next page at the given offset and updates hasMoreExpenses', async () => {
    useExpenseStore.setState({ expenses: [FAKE_EXPENSE], hasMoreExpenses: true });
    const nextPage = [expense({ id: 'e2' })];
    mockListExpenses.mockResolvedValue(nextPage);

    await useExpenseStore.getState().loadMoreExpenses();

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE, offset: 1 });
    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([FAKE_EXPENSE, ...nextPage]);
    expect(state.hasMoreExpenses).toBe(false);
  });

  it('does nothing when there is no more to load', async () => {
    useExpenseStore.setState({ expenses: [FAKE_EXPENSE], hasMoreExpenses: false });

    await useExpenseStore.getState().loadMoreExpenses();

    expect(mockListExpenses).not.toHaveBeenCalled();
  });
});

describe('useExpenseStore search/category filtering', () => {
  it('re-fetches page one with the search text as a server-side filter', async () => {
    useExpenseStore.setState({ expenses: [FAKE_EXPENSE], hasMoreExpenses: true });
    const matches = [expense({ id: 'e2', note: 'kopi pagi' })];
    mockListExpenses.mockResolvedValue(matches);

    await useExpenseStore.getState().setSearchQuery('kopi');

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE, noteSearch: 'kopi' });
    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual(matches);
    expect(state.searchQuery).toBe('kopi');
    expect(state.filtering).toBe(false);
  });

  it('treats a whitespace-only search as no filter', async () => {
    mockListExpenses.mockResolvedValue([]);

    await useExpenseStore.getState().setSearchQuery('   ');

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE });
  });

  it('re-fetches page one filtered by category id', async () => {
    mockListExpenses.mockResolvedValue([FAKE_EXPENSE]);

    await useExpenseStore.getState().setCategoryFilter('c1');

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE, categoryId: 'c1' });
    expect(useExpenseStore.getState().categoryFilterId).toBe('c1');
  });

  it('clearing the category filter goes back to an unfiltered fetch', async () => {
    useExpenseStore.setState({ categoryFilterId: 'c1' });
    mockListExpenses.mockResolvedValue([]);

    await useExpenseStore.getState().setCategoryFilter(null);

    expect(mockListExpenses).toHaveBeenCalledWith({ limit: EXPENSES_PAGE_SIZE });
    expect(useExpenseStore.getState().categoryFilterId).toBeNull();
  });

  it('combines a search query and a category filter in the same request', async () => {
    useExpenseStore.setState({ categoryFilterId: 'c1' });
    mockListExpenses.mockResolvedValue([]);

    await useExpenseStore.getState().setSearchQuery('kopi');

    expect(mockListExpenses).toHaveBeenCalledWith({
      limit: EXPENSES_PAGE_SIZE,
      noteSearch: 'kopi',
      categoryId: 'c1',
    });
  });

  it('discards a stale filter response that resolves after a newer filter change', async () => {
    let resolveFirst: (value: Expense[]) => void;
    mockListExpenses.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirst = resolve;
        }),
    );
    const firstCall = useExpenseStore.getState().setSearchQuery('kopi');

    const secondResult = [expense({ id: 'e3', note: 'teh' })];
    mockListExpenses.mockResolvedValueOnce(secondResult);
    await useExpenseStore.getState().setSearchQuery('teh');

    // The slow first request finally resolves after the second one already won.
    resolveFirst!([expense({ id: 'e-stale', note: 'kopi' })]);
    await firstCall;

    expect(useExpenseStore.getState().expenses).toEqual(secondResult);
  });
});

describe('useExpenseStore balance bookkeeping', () => {
  // Pagination means the store's `expenses` array may no longer hold every row, so balance
  // and the monthly income/expense split are tracked as their own fields (seeded from
  // `getExpenseTotals`) rather than derived from `expenses` — these optimistic actions must
  // keep those fields in sync by hand instead of relying on a recompute-from-the-full-list.
  it('adds an optimistic expense to the balance and this month’s total', () => {
    useExpenseStore.setState({ balance: 100_000, monthIncome: 0, monthExpense: 0 });

    useExpenseStore.getState().addExpenseOptimistic(expense({ amount: 20_000, type: 'expense' }));

    const state = useExpenseStore.getState();
    expect(state.balance).toBe(80_000);
    expect(state.monthExpense).toBe(20_000);
  });

  it('does not add to this month’s total when the expense falls in an earlier month', () => {
    useExpenseStore.setState({ balance: 100_000, monthIncome: 0, monthExpense: 0 });

    useExpenseStore
      .getState()
      .addExpenseOptimistic(expense({ amount: 20_000, type: 'expense', date: '2020-01-15T00:00:00.000Z' }));

    const state = useExpenseStore.getState();
    expect(state.balance).toBe(80_000); // all-time balance is unaffected by which month
    expect(state.monthExpense).toBe(0);
  });

  it('reverses the balance effect of a removed expense', () => {
    const toRemove = expense({ id: 'e9', amount: 15_000, type: 'income' });
    useExpenseStore.setState({ expenses: [toRemove], balance: 50_000, monthIncome: 15_000, monthExpense: 0 });

    useExpenseStore.getState().removeExpense('e9');

    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([]);
    expect(state.balance).toBe(35_000);
    expect(state.monthIncome).toBe(0);
  });

  it('applies only the diff when an edit changes the amount', () => {
    const original = expense({ id: 'e5', amount: 10_000, type: 'expense' });
    useExpenseStore.setState({ expenses: [original], balance: 90_000, monthIncome: 0, monthExpense: 10_000 });

    useExpenseStore.getState().replaceExpense('e5', expense({ id: 'e5', amount: 30_000, type: 'expense' }));

    const state = useExpenseStore.getState();
    expect(state.balance).toBe(70_000); // 90_000 - (30_000 - 10_000)
    expect(state.monthExpense).toBe(30_000);
  });
});
