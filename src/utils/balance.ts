import { Expense } from '../types';

/**
 * The all-time running balance across every expense ever recorded — not scoped to the
 * current month. See ROADMAP's non-goals: no per-account balance tracking, Home's "Sisa
 * Saldo" stays one overall number.
 */
export function calculateBalance(expenses: Pick<Expense, 'type' | 'amount'>[]): number {
  let total = 0;
  for (const e of expenses) {
    total += e.type === 'income' ? Number(e.amount) : -Number(e.amount);
  }
  return total;
}
