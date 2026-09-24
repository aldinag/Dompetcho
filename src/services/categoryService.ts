import { supabase } from '../lib/supabase';
import { Category } from '../types';

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
