import { supabase } from '../lib/supabase';
import { Expense, ExpenseSource, TransactionType } from '../types';

export interface CreateExpenseInput {
  userId: string;
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  note: string | null;
  date: string; // ISO timestamp
  source: ExpenseSource;
  type: TransactionType;
}

export interface ListExpensesOptions {
  limit?: number;
  offset?: number;
}

// Home's recent-transactions list passes `limit` (and a growing `offset` for "load more") so
// it doesn't pull the whole table on every load. Summary's month × category breakdown has its
// own, already-aggregated RPC (`getExpenseBreakdownByMonth`) instead of calling this unbounded.
export async function listExpenses(options: ListExpensesOptions = {}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*, category:categories(*), account:accounts(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (options.limit !== undefined) {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + options.limit - 1);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface ExpenseTotals {
  balance: number;
  monthIncome: number;
  monthExpense: number;
}

// Backed by the `expense_totals` Postgres RPC (see supabase/schema.sql) — the all-time
// balance and the current month's income/expense are summed server-side instead of pulling
// every row down to sum client-side (see ROADMAP's "Move the totals and Summary breakdown to
// server-side aggregates").
export async function getExpenseTotals(monthStart: string, monthEnd: string): Promise<ExpenseTotals> {
  const { data, error } = await supabase
    .rpc('expense_totals', { month_start: monthStart, month_end: monthEnd })
    .single();
  if (error) throw error;

  const row = data as { balance: number; month_income: number; month_expense: number };
  return {
    balance: Number(row.balance),
    monthIncome: Number(row.month_income),
    monthExpense: Number(row.month_expense),
  };
}

export interface MonthlyExpenseBreakdown {
  monthKey: string; // "YYYY-MM"
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  amount: number;
}

// Backed by the `expense_breakdown_by_month` Postgres RPC — Summary's breakdown summed
// server-side instead of pulling every expense (with its category/account joins) down to group
// client-side. Expense-only (income is excluded, same as before), one row per
// month/category/account combination that has at least one expense, newest month first. The
// Kategori/Akun toggle collapses these rows to one dimension client-side (see
// utils/summaryBreakdown.ts).
export async function getExpenseBreakdownByMonth(): Promise<MonthlyExpenseBreakdown[]> {
  const { data, error } = await supabase.rpc('expense_breakdown_by_month');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    monthKey: row.month_key,
    categoryId: row.category_id,
    categoryName: row.category_name,
    accountId: row.account_id,
    accountName: row.account_name,
    amount: Number(row.amount),
  }));
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: input.userId,
      amount: input.amount,
      category_id: input.categoryId,
      account_id: input.accountId,
      note: input.note,
      date: input.date,
      source: input.source,
      type: input.type,
    })
    .select('*, category:categories(*)')
    .single();
  if (error) throw error;
  return data;
}

export interface UpdateExpenseInput {
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  note: string | null;
  date: string; // ISO timestamp
  type: TransactionType;
}

// `source` (manual vs receipt_ocr) is intentionally not editable — it's the row's
// provenance, not a correction the user should be able to change. Existing RLS ("Users
// can update their own expenses") already covers this; no schema change needed.
export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount: input.amount,
      category_id: input.categoryId,
      account_id: input.accountId,
      note: input.note,
      date: input.date,
      type: input.type,
    })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();
  if (error) throw error;
  return data;
}
