// Deterministic per-account accent for Summary's "Akun" breakdown. Unlike categories
// (fixed names keyed into CATEGORY_COLORS), accounts are user-created with arbitrary ids,
// so the color is picked by hashing the account id into a fixed palette instead.
const ACCOUNT_PALETTE = [
  '#2563EB', // blue
  '#D97706', // amber
  '#059669', // emerald
  '#DB2777', // pink
  '#7C3AED', // violet
  '#0D9488', // teal
  '#DC2626', // red
  '#4F46E5', // indigo
];

// Distinct from every CATEGORY_COLORS entry (including "Other"'s gray, #6B7280) and from
// ACCOUNT_PALETTE — used only for the untagged ("Tanpa Akun") slice.
export const UNTAGGED_ACCOUNT_COLOR = '#94A3B8';

function hashAccountId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000000007;
  }
  return hash;
}

export function accountColor(accountId: string | null | undefined): string {
  if (!accountId) return UNTAGGED_ACCOUNT_COLOR;
  return ACCOUNT_PALETTE[hashAccountId(accountId) % ACCOUNT_PALETTE.length];
}
