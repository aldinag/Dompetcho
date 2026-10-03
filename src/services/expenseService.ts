import { supabase } from '../lib/supabase';
import { Expense, ExpenseSource, TransactionType } from '../types';
import { calculateBalance } from '../utils/balance';

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

// With no options, fetches every row — Summary's all-time, all-category month grouping
// still needs that. Home's recent-transactions list passes `limit` (and a growing `offset`
// for "load more") so it doesn't pull the whole table on every load.
export async function listExpenses(options: ListExpensesOptions = {}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*, category:categories(*)')
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

// Home's "Sisa Saldo" needs the all-time sum, which can't come from a bounded page — so this
// still scans every row, but only the two columns the sum actually needs (no category join),
// which is far lighter than the listing above. A server-side aggregate (a Postgres RPC) would
// avoid the scan entirely; left as a follow-up rather than folded into this change.
export async function getExpenseTotals(monthStart: string, monthEnd: string): Promise<ExpenseTotals> {
  const [allTime, thisMonth] = await Promise.all([
    supabase.from('expenses').select('amount, type'),
    supabase.from('expenses').select('amount, type').gte('date', monthStart).lt('date', monthEnd),
  ]);
  if (allTime.error) throw allTime.error;
  if (thisMonth.error) throw thisMonth.error;

  const balance = calculateBalance(allTime.data ?? []);

  let monthIncome = 0;
  let monthExpense = 0;
  for (const e of thisMonth.data ?? []) {
    const amount = Number(e.amount);
    if (e.type === 'income') monthIncome += amount;
    else monthExpense += amount;
  }

  return { balance, monthIncome, monthExpense };
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
