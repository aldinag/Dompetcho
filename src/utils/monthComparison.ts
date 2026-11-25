import type { MonthlyExpenseBreakdown } from '../services/expenseService';
import { formatRupiah } from './format';

export type DeltaDirection = 'less' | 'more' | 'same';

export interface MonthTotalDelta {
  currentTotal: number;
  previousTotal: number;
  /** currentTotal - previousTotal; positive means more was spent this month. */
  deltaAmount: number;
  direction: DeltaDirection;
}

export interface CategoryDelta {
  categoryId: string; // 'uncategorized' for the synthetic row, matching summaryBreakdown.ts
  deltaAmount: number;
  direction: DeltaDirection;
}

function directionOf(deltaAmount: number): DeltaDirection {
  if (deltaAmount === 0) return 'same';
  return deltaAmount > 0 ? 'more' : 'less';
}

/** The "YYYY-MM" key for the calendar month right before `monthKey`. */
function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

function sumByMonth(rows: MonthlyExpenseBreakdown[], monthKey: string): number {
  return rows.filter(r => r.monthKey === monthKey).reduce((sum, r) => sum + r.amount, 0);
}

// `rows` is ROADMAP's reused `breakdownRows` state — already expense-only (see
// `getExpenseBreakdownByMonth`'s doc comment), so there's no income to filter out here.
// Returns null when the previous calendar month has no rows at all, which the caller treats
// as "hide the comparison" (per ROADMAP's "Summary: compare with last month").
export function monthTotalDelta(rows: MonthlyExpenseBreakdown[], monthKey: string): MonthTotalDelta | null {
  const prevKey = previousMonthKey(monthKey);
  const hasPreviousMonth = rows.some(r => r.monthKey === prevKey);
  if (!hasPreviousMonth) return null;

  const currentTotal = sumByMonth(rows, monthKey);
  const previousTotal = sumByMonth(rows, prevKey);
  const deltaAmount = currentTotal - previousTotal;
  return { currentTotal, previousTotal, deltaAmount, direction: directionOf(deltaAmount) };
}

/** Per-category deltas for `monthKey` vs. the previous calendar month. Empty when there's no
 * previous month to compare against — a category missing from the previous month's rows is
 * treated as having spent 0 then, so its delta is its full current amount. */
export function monthCategoryDeltas(rows: MonthlyExpenseBreakdown[], monthKey: string): Map<string, CategoryDelta> {
  const prevKey = previousMonthKey(monthKey);
  const result = new Map<string, CategoryDelta>();
  const hasPreviousMonth = rows.some(r => r.monthKey === prevKey);
  if (!hasPreviousMonth) return result;

  const currentByCategory = new Map<string, number>();
  for (const r of rows) {
    if (r.monthKey !== monthKey) continue;
    const id = r.categoryId ?? 'uncategorized';
    currentByCategory.set(id, (currentByCategory.get(id) ?? 0) + r.amount);
  }

  const previousByCategory = new Map<string, number>();
  for (const r of rows) {
    if (r.monthKey !== prevKey) continue;
    const id = r.categoryId ?? 'uncategorized';
    previousByCategory.set(id, (previousByCategory.get(id) ?? 0) + r.amount);
  }

  for (const [categoryId, currentAmount] of currentByCategory) {
    const previousAmount = previousByCategory.get(categoryId) ?? 0;
    const deltaAmount = currentAmount - previousAmount;
    result.set(categoryId, { categoryId, deltaAmount, direction: directionOf(deltaAmount) });
  }
  return result;
}

export function formatMonthDeltaLabel(delta: MonthTotalDelta): string {
  const amount = formatRupiah(Math.abs(delta.deltaAmount));
  if (delta.direction === 'less') return `${amount} lebih hemat dari bulan lalu`;
  if (delta.direction === 'more') return `${amount} lebih boros dari bulan lalu`;
  return 'Sama dengan bulan lalu';
}

export function formatCategoryDeltaLabel(delta: CategoryDelta): string {
  if (delta.direction === 'same') return 'Sama';
  const sign = delta.direction === 'more' ? '+' : '-';
  return `${sign}${formatRupiah(Math.abs(delta.deltaAmount))}`;
}
