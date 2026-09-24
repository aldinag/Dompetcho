// Deterministic per-category accent, used for the Summary chart and the colored icon
// badge on each expense row. Keys match the `name` seeded in supabase/schema.sql.
export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Shopping: '#8B5FBF',
  Bills: '#0EA5E9',
  Entertainment: '#EC4899',
  Health: '#EF4444',
  Transfer: '#16A34A',
  Other: '#6B7280',
};

export function categoryColor(name: string | undefined | null): string {
  if (!name) return CATEGORY_COLORS.Other;
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS.Other;
}

/** A translucent version of the category color, for icon-badge backgrounds. */
export function categoryTint(name: string | undefined | null): string {
  const hex = categoryColor(name);
  return `${hex}26`; // ~15% alpha
}
