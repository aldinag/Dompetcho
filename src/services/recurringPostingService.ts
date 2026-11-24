import { createExpense } from './expenseService';
import { listRecurringTransactions, markRecurringTransactionPosted } from './recurringService';
import { dueOccurrences } from '../utils/recurringOccurrences';
import { timestampFromLocal } from '../utils/timestamp';

// Postgres/PostgREST's error code for a unique-constraint violation — hit when two devices
// (or two calls of this same step) race to post the same rule's occurrence. The partial
// unique index on `expenses (recurring_id, occurrence_date)` (see schema.sql) is what makes
// this safe to just swallow and move on, rather than double-posting.
const UNIQUE_VIOLATION_CODE = '23505';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === UNIQUE_VIOLATION_CODE;
}

/**
 * Posts every due occurrence of every active recurring rule as a normal expense/income row
 * (`source: 'recurring'`), catching up any missed periods up to the cap `dueOccurrences`
 * already enforces. Meant to be called once per app foreground.
 *
 * Safe to call from multiple devices racing at once: an occurrence someone else already
 * posted comes back as a unique-violation, which is treated as already-done rather than an
 * error. A rule that fails for a real reason (not a duplicate) is skipped — it's simply left
 * for the next call to retry — without blocking the other rules in the same batch.
 *
 * Returns how many new expense/income rows were actually inserted (not counting occurrences
 * that turned out to already be posted).
 */
export async function postDueRecurringTransactions(today: Date = new Date()): Promise<number> {
  const rules = await listRecurringTransactions();
  let postedCount = 0;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const occurrenceDates = dueOccurrences(
      { frequency: rule.frequency, anchorDate: rule.anchor_date, lastPostedOn: rule.last_posted_on },
      today,
    );
    if (occurrenceDates.length === 0) continue;

    try {
      let latestPostedOn = rule.last_posted_on;
      for (const occurrenceDate of occurrenceDates) {
        try {
          await createExpense({
            userId: rule.user_id,
            amount: Number(rule.amount),
            categoryId: rule.category_id,
            accountId: rule.account_id,
            note: rule.note,
            date: timestampFromLocal(occurrenceDate, null),
            source: 'recurring',
            type: rule.type,
            recurringId: rule.id,
            occurrenceDate,
          });
          postedCount += 1;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          // Already posted (by this call or another device) — still advance past it below.
        }
        latestPostedOn = occurrenceDate;
      }
      if (latestPostedOn && latestPostedOn !== rule.last_posted_on) {
        await markRecurringTransactionPosted(rule.id, latestPostedOn);
      }
    } catch (error) {
      console.warn(`Gagal memposting transaksi berulang ${rule.id}`, error);
    }
  }

  return postedCount;
}
