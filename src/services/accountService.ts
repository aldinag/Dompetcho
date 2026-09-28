import { supabase } from '../lib/supabase';
import { Account, AccountKind } from '../types';

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAccount(userId: string, name: string, kind: AccountKind): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name, kind })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id: string, name: string, kind: AccountKind): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update({ name, kind })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}
