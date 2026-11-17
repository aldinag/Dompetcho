import { formatRupiah } from './format';

export type BudgetStatus = 'neutral' | 'warning' | 'danger';

export interface BudgetProgress {
  /** Spend as a percentage of the limit — uncapped, so it can exceed 100. */
  percent: number;
  status: BudgetStatus;
}

// Thresholds per ROADMAP's "Monthly budget per category": neutral under 80%, warning from
// 80% (inclusive) up to and including 100%, danger strictly over 100%. A non-positive limit
// (shouldn't happen — the schema's `monthly_limit > 0` check guards it) reads as neutral
// rather than dividing by zero.
export function budgetProgress(spent: number, limit: number): BudgetProgress {
  if (limit <= 0) return { percent: 0, status: 'neutral' };

  const percent = (Math.max(spent, 0) / limit) * 100;
  const status: BudgetStatus = percent > 100 ? 'danger' : percent >= 80 ? 'warning' : 'neutral';
  return { percent, status };
}

export function formatBudgetProgressLabel(spent: number, limit: number): string {
  return `${formatRupiah(spent)} dari ${formatRupiah(limit)}`;
}
