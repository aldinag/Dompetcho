import { supabase } from '../lib/supabase';
import { RecurringFrequency, RecurringTransaction, TransactionType } from '../types';

export interface RecurringTransactionInput {
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  anchorDate: string; // "yyyy-MM-dd"
  isActive: boolean;
}

export async function listRecurringTransactions(): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase.from('recurring_transactions').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function createRecurringTransaction(input: RecurringTransactionInput): Promise<RecurringTransaction> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: input.userId,
      type: input.type,
      amount: input.amount,
      category_id: input.categoryId,
      account_id: input.accountId,
      note: input.note,
      frequency: input.frequency,
      anchor_date: input.anchorDate,
      is_active: input.isActive,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringTransaction(id: string, input: RecurringTransactionInput): Promise<RecurringTransaction> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({
      type: input.type,
      amount: input.amount,
      category_id: input.categoryId,
      account_id: input.accountId,
      note: input.note,
      frequency: input.frequency,
      anchor_date: input.anchorDate,
      is_active: input.isActive,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;
}

// Used by `recurringPostingService.ts` right after posting a rule's occurrences — a narrow
// update of just `last_posted_on`, not a full `updateRecurringTransaction` call, so it can't
// clobber an edit the user made to the rule's other fields in a race with the posting step.
export async function markRecurringTransactionPosted(id: string, lastPostedOn: string): Promise<RecurringTransaction> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({ last_posted_on: lastPostedOn })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
