import { useExpenseStore } from '../useExpenseStore';
import { listAccounts } from '../../services/accountService';
import { listCategories } from '../../services/categoryService';
import { listExpenses } from '../../services/expenseService';
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
jest.mock('../../services/expenseService', () => ({ listExpenses: jest.fn() }));

const mockListExpenses = listExpenses as jest.MockedFunction<typeof listExpenses>;
const mockListCategories = listCategories as jest.MockedFunction<typeof listCategories>;
const mockListAccounts = listAccounts as jest.MockedFunction<typeof listAccounts>;

const FAKE_EXPENSE = { id: 'e1' } as Expense;
const FAKE_CATEGORY = { id: 'c1' } as Category;

beforeEach(() => {
  jest.resetAllMocks();
  useExpenseStore.setState({ expenses: [], categories: [], accounts: [], loading: false, refreshing: false });
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

  it('sets all three when every fetch succeeds', async () => {
    mockListExpenses.mockResolvedValue([FAKE_EXPENSE]);
    mockListCategories.mockResolvedValue([FAKE_CATEGORY]);
    mockListAccounts.mockResolvedValue([]);

    await useExpenseStore.getState().loadInitial();

    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([FAKE_EXPENSE]);
    expect(state.categories).toEqual([FAKE_CATEGORY]);
  });
});
