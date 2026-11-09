import type { IconName } from '../components/Icon';
import { accountColor } from '../constants/accountColors';
import { categoryColor } from '../constants/categoryColors';
import { categoryIcon } from '../constants/categoryIcons';
import { categoryLabel } from '../constants/categoryLabels';
import type { MonthlyExpenseBreakdown } from '../services/expenseService';

export type BreakdownMode = 'category' | 'account';

export interface BreakdownRow {
  id: string;
  label: string;
  color: string;
  icon?: IconName;
  amount: number;
}

export interface MonthSection {
  key: string;
  title: string;
  total: number;
  data: BreakdownRow[];
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Classifies one RPC row into the list row it contributes to under the chosen mode — a
// category (falling back to "Lainnya"/uncategorized) or a source account (falling back to
// "Tanpa Akun" for untagged expenses, see ROADMAP's account-tag item).
function rowFor(row: MonthlyExpenseBreakdown, mode: BreakdownMode): Omit<BreakdownRow, 'amount'> {
  if (mode === 'category') {
    return {
      id: row.categoryId ?? 'uncategorized',
      label: categoryLabel(row.categoryName),
      color: categoryColor(row.categoryName),
      icon: categoryIcon(row.categoryName),
    };
  }
  return {
    id: row.accountId ?? 'untagged',
    label: row.accountName ?? 'Tanpa Akun',
    color: accountColor(row.accountId),
  };
}

// The `expense_breakdown_by_month` RPC (see supabase/schema.sql) does the expense-only
// filtering and the month × category × account summing server-side and returns rows newest
// month first. This collapses them to the selected dimension (summing rows that land on the
// same category/account) and reshapes them into the sections SectionList expects: months in
// the RPC's newest-first order, largest row first within each month.
export function buildMonthSections(rows: MonthlyExpenseBreakdown[], mode: BreakdownMode): MonthSection[] {
  const sections: MonthSection[] = [];
  const indexByMonth = new Map<string, number>();
  const rowMaps = new Map<string, Map<string, BreakdownRow>>();

  for (const r of rows) {
    let index = indexByMonth.get(r.monthKey);
    if (index === undefined) {
      index = sections.length;
      indexByMonth.set(r.monthKey, index);
      sections.push({ key: r.monthKey, title: monthLabel(r.monthKey), total: 0, data: [] });
      rowMaps.set(r.monthKey, new Map());
    }
    sections[index].total += r.amount;

    const row = rowFor(r, mode);
    const rowMap = rowMaps.get(r.monthKey)!;
    const existing = rowMap.get(row.id);
    if (existing) {
      existing.amount += r.amount;
    } else {
      rowMap.set(row.id, { ...row, amount: r.amount });
    }
  }

  for (const section of sections) {
    section.data = Array.from(rowMaps.get(section.key)!.values()).sort((a, b) => b.amount - a.amount);
  }

  return sections;
}
