import { Account } from '../types';

/**
 * Matches a receipt's raw "Sumber Dana"/"Rekening Sumber" text against the user's own
 * accounts by name (case-insensitive substring) — e.g. an account named "Mandiri" matches a
 * label like "TEGAR ALDINA GALARI / Bank Mandiri - •••••••7448". Returns null rather than
 * guessing when no account name appears in the label.
 */
export function matchAccountByLabel(label: string | null, accounts: Account[]): Account | null {
  if (!label) return null;
  const normalized = label.toLowerCase();
  return accounts.find(account => normalized.includes(account.name.trim().toLowerCase())) ?? null;
}
