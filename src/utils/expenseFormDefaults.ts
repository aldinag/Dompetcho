import { Account, Category, Expense, TransactionType } from '../types';

export interface ExpenseFormDefaults {
  categoryId: string | null;
  accountId: string | null;
  type: TransactionType;
}

const BLANK_DEFAULTS: ExpenseFormDefaults = { categoryId: null, accountId: null, type: 'expense' };

// Picks starting values for a brand-new manual entry from whatever expense was added most
// recently, so repeat entries (same category/account/type) don't cost extra taps. Falls back
// to the usual blank defaults when there's no history yet, or when the latest expense's
// category/account has since been deleted elsewhere.
export function pickExpenseFormDefaults(
  expenses: Expense[],
  categories: Category[],
  accounts: Account[],
): ExpenseFormDefaults {
  const latest = latestExpense(expenses);
  if (!latest) return BLANK_DEFAULTS;

  const categoryId =
    latest.category_id && categories.some(c => c.id === latest.category_id) ? latest.category_id : null;
  const accountId = latest.account_id && accounts.some(a => a.id === latest.account_id) ? latest.account_id : null;
  return { categoryId, accountId, type: latest.type };
}

// Mirrors listExpenses' own ordering (date desc, then created_at desc) rather than assuming
// the caller already sorted — so this stays correct even against a page that isn't newest-first.
function latestExpense(expenses: Expense[]): Expense | undefined {
  return expenses.reduce<Expense | undefined>((latest, candidate) => {
    if (!latest) return candidate;
    const byDate = new Date(candidate.date).getTime() - new Date(latest.date).getTime();
    if (byDate !== 0) return byDate > 0 ? candidate : latest;
    const byCreated = new Date(candidate.created_at).getTime() - new Date(latest.created_at).getTime();
    return byCreated > 0 ? candidate : latest;
  }, undefined);
}
