// Category `name` values stay in English in the database (matches the seed in
// supabase/schema.sql) — this only maps them to Indonesian for display.
export const CATEGORY_LABELS_ID: Record<string, string> = {
  Food: 'Makanan',
  Transport: 'Transportasi',
  Shopping: 'Belanja',
  Bills: 'Tagihan',
  Entertainment: 'Hiburan',
  Health: 'Kesehatan',
  Transfer: 'Transfer',
  Other: 'Lainnya',
};

export function categoryLabel(name: string | undefined | null): string {
  if (!name) return CATEGORY_LABELS_ID.Other;
  return CATEGORY_LABELS_ID[name] ?? name;
}
