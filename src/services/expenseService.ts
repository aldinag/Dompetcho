import { supabase } from '../lib/supabase';
import { Expense, ExpenseSource, TransactionType } from '../types';

export interface CreateExpenseInput {
  userId: string;
  amount: number;
  categoryId: string | null;
  note: string | null;
  date: string; // ISO timestamp
  source: ExpenseSource;
  type: TransactionType;
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, category:categories(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: input.userId,
      amount: input.amount,
      category_id: input.categoryId,
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
