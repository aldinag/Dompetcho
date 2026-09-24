// Mirrors the default categories seeded server-side (see supabase/schema.sql).
// Kept here only so the client has icons/order without waiting on a round trip.
export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍜' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills', icon: '🧾' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Health', icon: '💊' },
  { name: 'Transfer', icon: '💸' },
  { name: 'Other', icon: '📦' },
] as const;

export const DEFAULT_RECEIPT_CATEGORY_NAME = 'Transfer';
