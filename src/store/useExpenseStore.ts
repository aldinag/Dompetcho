import { create } from 'zustand';
import { createAccount, deleteAccount, listAccounts, updateAccount } from '../services/accountService';
import { listCategories } from '../services/categoryService';
import { getExpenseTotals, listExpenses } from '../services/expenseService';
import { Account, AccountKind, Category, Expense } from '../types';
import { currentMonthRange } from '../utils/dateRange';

// Keeps Home's "Transaksi Terakhir" fetch bounded regardless of how long someone has used
// the app — see ROADMAP's "Add pagination to listExpenses".
export const EXPENSES_PAGE_SIZE = 30;

interface ExpenseState {
  expenses: Expense[];
  hasMoreExpenses: boolean;
  loadingMoreExpenses: boolean;
  /** Committed (debounced) search text — empty string means no search filter. */
  searchQuery: string;
  categoryFilterId: string | null;
  filtering: boolean;
  balance: number;
  monthIncome: number;
  monthExpense: number;
  categories: Category[];
  accounts: Account[];
  loading: boolean;
  refreshing: boolean;
  loadInitial: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMoreExpenses: () => Promise<void>;
  /** Internal: re-fetches page one against the current filters; shared by the two setters below. */
  applyFilters: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  setCategoryFilter: (categoryId: string | null) => Promise<void>;
  addExpenseOptimistic: (expense: Expense) => void;
  replaceExpense: (tempId: string, real: Expense) => void;
  removeExpense: (id: string) => void;
  addAccount: (userId: string, name: string, kind: AccountKind) => Promise<void>;
  renameAccount: (id: string, name: string, kind: AccountKind) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  /** Clears everything loaded for the previous user — called after account deletion. */
  reset: () => void;
}

function currentMonthTotals() {
  const { start, end } = currentMonthRange();
  return getExpenseTotals(new Date(start).toISOString(), new Date(end).toISOString());
}

// Applies the balance/month-total effect of removing `prev` and/or adding `next` — the same
// formula covers every optimistic-store case: a new expense (prev undefined), an edit (both
// set, possibly with a different amount/type/date), a removal (next undefined), and an edit
// revert (prev/next swapped from the original edit).
function applyDelta(
  state: Pick<ExpenseState, 'balance' | 'monthIncome' | 'monthExpense'>,
  prev: Pick<Expense, 'amount' | 'type' | 'date'> | undefined,
  next: Pick<Expense, 'amount' | 'type' | 'date'> | undefined,
) {
  const { start, end } = currentMonthRange();
  let { balance, monthIncome, monthExpense } = state;

  for (const [entry, sign] of [
    [prev, -1],
    [next, 1],
  ] as const) {
    if (!entry) continue;
    const amount = Number(entry.amount) * sign;
    balance += entry.type === 'income' ? amount : -amount;
    const at = new Date(entry.date).getTime();
    if (at >= start && at < end) {
      if (entry.type === 'income') monthIncome += amount;
      else monthExpense += amount;
    }
  }

  return { balance, monthIncome, monthExpense };
}

// Builds the filter options every `listExpenses` call site shares, from whatever search
// text/category filter is currently committed in the store.
function currentFilterOptions(state: Pick<ExpenseState, 'searchQuery' | 'categoryFilterId'>) {
  const noteSearch = state.searchQuery.trim();
  return {
    noteSearch: noteSearch === '' ? undefined : noteSearch,
    categoryId: state.categoryFilterId ?? undefined,
  };
}

// Bumped on every filter change so a slow, now-superseded fetch (e.g. the search debounce
// firing just after a category chip tap) can detect it's stale and not clobber a newer result.
let filterRequestId = 0;

export const useExpenseStore = create<ExpenseState>((set, get) => ({
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

  loadInitial: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      // allSettled, not all: these are independent, and one failing (e.g. a schema
      // migration for a newer field that hasn't been run yet) must not discard the others —
      // that previously blanked the whole Home screen, including expenses that loaded fine.
      const [expensesResult, categoriesResult, accountsResult, totalsResult] = await Promise.allSettled([
        listExpenses({ limit: EXPENSES_PAGE_SIZE, ...currentFilterOptions(get()) }),
        listCategories(),
        listAccounts(),
        currentMonthTotals(),
      ]);
      if (expensesResult.status === 'fulfilled') {
        set({ expenses: expensesResult.value, hasMoreExpenses: expensesResult.value.length === EXPENSES_PAGE_SIZE });
      }
      if (categoriesResult.status === 'fulfilled') set({ categories: categoriesResult.value });
      if (accountsResult.status === 'fulfilled') set({ accounts: accountsResult.value });
      if (totalsResult.status === 'fulfilled') {
        set({
          balance: totalsResult.value.balance,
          monthIncome: totalsResult.value.monthIncome,
          monthExpense: totalsResult.value.monthExpense,
        });
      }

      const firstFailure = [expensesResult, categoriesResult, accountsResult, totalsResult].find(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (firstFailure) throw firstFailure.reason;
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      const [expenses, totals] = await Promise.all([
        listExpenses({ limit: EXPENSES_PAGE_SIZE, ...currentFilterOptions(get()) }),
        currentMonthTotals(),
      ]);
      set({
        expenses,
        hasMoreExpenses: expenses.length === EXPENSES_PAGE_SIZE,
        balance: totals.balance,
        monthIncome: totals.monthIncome,
        monthExpense: totals.monthExpense,
      });
    } finally {
      set({ refreshing: false });
    }
  },

  loadMoreExpenses: async () => {
    const { hasMoreExpenses, loadingMoreExpenses, expenses } = get();
    if (!hasMoreExpenses || loadingMoreExpenses) return;
    set({ loadingMoreExpenses: true });
    try {
      const nextPage = await listExpenses({
        limit: EXPENSES_PAGE_SIZE,
        offset: expenses.length,
        ...currentFilterOptions(get()),
      });
      set(state => ({
        expenses: [...state.expenses, ...nextPage],
        hasMoreExpenses: nextPage.length === EXPENSES_PAGE_SIZE,
      }));
    } finally {
      set({ loadingMoreExpenses: false });
    }
  },

  // Re-fetches page one against the newly-committed filter — shared by both setters so a
  // search-text change and a category-chip tap behave the same way.
  applyFilters: async () => {
    const requestId = ++filterRequestId;
    set({ filtering: true });
    try {
      const expenses = await listExpenses({ limit: EXPENSES_PAGE_SIZE, ...currentFilterOptions(get()) });
      if (requestId !== filterRequestId) return; // superseded by a later filter change
      set({ expenses, hasMoreExpenses: expenses.length === EXPENSES_PAGE_SIZE });
    } finally {
      if (requestId === filterRequestId) set({ filtering: false });
    }
  },

  setSearchQuery: async query => {
    set({ searchQuery: query });
    await get().applyFilters();
  },

  setCategoryFilter: async categoryId => {
    set({ categoryFilterId: categoryId });
    await get().applyFilters();
  },

  addExpenseOptimistic: expense =>
    set(state => ({ expenses: [expense, ...state.expenses], ...applyDelta(state, undefined, expense) })),

  replaceExpense: (tempId, real) =>
    set(state => ({
      expenses: state.expenses.map(e => (e.id === tempId ? real : e)),
      ...applyDelta(state, state.expenses.find(e => e.id === tempId), real),
    })),

  removeExpense: id =>
    set(state => ({
      expenses: state.expenses.filter(e => e.id !== id),
      ...applyDelta(state, state.expenses.find(e => e.id === id), undefined),
    })),

  addAccount: async (userId, name, kind) => {
    const account = await createAccount(userId, name, kind);
    set(state => ({ accounts: [...state.accounts, account].sort((a, b) => a.name.localeCompare(b.name)) }));
  },

  renameAccount: async (id, name, kind) => {
    const account = await updateAccount(id, name, kind);
    set(state => ({
      accounts: state.accounts
        .map(a => (a.id === id ? account : a))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  removeAccount: async id => {
    await deleteAccount(id);
    set(state => ({ accounts: state.accounts.filter(a => a.id !== id) }));
  },

  reset: () =>
    set({
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
    }),
}));
