import { create } from 'zustand';
import { listCategories } from '../services/categoryService';
import { listExpenses } from '../services/expenseService';
import { Category, Expense } from '../types';

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  loading: boolean;
  refreshing: boolean;
  loadInitial: () => Promise<void>;
  refresh: () => Promise<void>;
  addExpenseOptimistic: (expense: Expense) => void;
  replaceExpense: (tempId: string, real: Expense) => void;
  removeExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  loading: false,
  refreshing: false,

  loadInitial: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [expenses, categories] = await Promise.all([listExpenses(), listCategories()]);
      set({ expenses, categories });
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
}));
