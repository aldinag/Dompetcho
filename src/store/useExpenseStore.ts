import { create } from 'zustand';
import { createAccount, deleteAccount, listAccounts, updateAccount } from '../services/accountService';
import { listCategories } from '../services/categoryService';
import { listExpenses } from '../services/expenseService';
import { Account, AccountKind, Category, Expense } from '../types';

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  loading: boolean;
  refreshing: boolean;
  loadInitial: () => Promise<void>;
  refresh: () => Promise<void>;
  addExpenseOptimistic: (expense: Expense) => void;
  replaceExpense: (tempId: string, real: Expense) => void;
  removeExpense: (id: string) => void;
  addAccount: (userId: string, name: string, kind: AccountKind) => Promise<void>;
  renameAccount: (id: string, name: string, kind: AccountKind) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  accounts: [],
  loading: false,
  refreshing: false,

  loadInitial: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      // allSettled, not all: these three are independent, and one failing (e.g. a schema
      // migration for a newer field that hasn't been run yet) must not discard the others —
      // that previously blanked the whole Home screen, including expenses that loaded fine.
      const [expensesResult, categoriesResult, accountsResult] = await Promise.allSettled([
        listExpenses(),
        listCategories(),
        listAccounts(),
      ]);
      if (expensesResult.status === 'fulfilled') set({ expenses: expensesResult.value });
      if (categoriesResult.status === 'fulfilled') set({ categories: categoriesResult.value });
      if (accountsResult.status === 'fulfilled') set({ accounts: accountsResult.value });

      const firstFailure = [expensesResult, categoriesResult, accountsResult].find(
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
      const expenses = await listExpenses();
      set({ expenses });
    } finally {
      set({ refreshing: false });
    }
  },

  addExpenseOptimistic: expense => set(state => ({ expenses: [expense, ...state.expenses] })),

  replaceExpense: (tempId, real) =>
    set(state => ({ expenses: state.expenses.map(e => (e.id === tempId ? real : e)) })),

  removeExpense: id => set(state => ({ expenses: state.expenses.filter(e => e.id !== id) })),

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
}));
