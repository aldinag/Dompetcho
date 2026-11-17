import { supabase } from '../lib/supabase';
import { CategoryBudget } from '../types';

export async function listCategoryBudgets(): Promise<CategoryBudget[]> {
  const { data, error } = await supabase.from('category_budgets').select('*');
  if (error) throw error;
  return data ?? [];
}

// Upserts on the table's `(user_id, category_id)` unique constraint — one limit per category,
// setting a new one replaces the old.
export async function setCategoryBudget(userId: string, categoryId: string, monthlyLimit: number): Promise<CategoryBudget> {
  const { data, error } = await supabase
    .from('category_budgets')
    .upsert({ user_id: userId, category_id: categoryId, monthly_limit: monthlyLimit }, { onConflict: 'user_id,category_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function clearCategoryBudget(categoryId: string): Promise<void> {
  const { error } = await supabase.from('category_budgets').delete().eq('category_id', categoryId);
  if (error) throw error;
}
