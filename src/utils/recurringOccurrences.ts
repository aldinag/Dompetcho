import { RecurringFrequency } from '../types';

export interface RecurringOccurrenceRule {
  frequency: RecurringFrequency;
  anchorDate: string; // "yyyy-MM-dd", the rule's first occurrence
  lastPostedOn: string | null; // "yyyy-MM-dd" of the most recent occurrence already posted
}

// A long-dormant rule could have dozens of occurrences due at once; capped so one catch-up
// call can't flood the caller (it should call again next time to pick up the rest).
const MAX_OCCURRENCES_PER_CALL = 12;

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Keeps the anchor's day-of-month, clamped to the last day of a shorter month (e.g. an
// anchor on the 31st posts on the 28th/29th/30th in a month that doesn't have one) — and
// reverts to the 31st again once a longer month comes back around.
function addMonthsClamped(anchor: Date, monthsToAdd: number): Date {
  const anchorDay = anchor.getDate();
  const monthIndex = anchor.getMonth() + monthsToAdd;
  const targetYear = anchor.getFullYear() + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(anchorDay, lastDayOfMonth(targetYear, targetMonthIndex));
  return new Date(targetYear, targetMonthIndex, day);
}

/**
 * The next occurrence `rule` will post, regardless of whether it's due yet — unlike
 * `dueOccurrences`, this isn't capped to `today`. Used to show a rule's upcoming date in the
 * manage-rules UI, before any posting has happened.
 */
export function nextOccurrenceDate(rule: RecurringOccurrenceRule): string {
  const anchor = parseLocalDate(rule.anchorDate);
  const lastPostedOn = rule.lastPostedOn ? parseLocalDate(rule.lastPostedOn) : null;

  if (rule.frequency === 'weekly') {
    const next = lastPostedOn ? addDays(lastPostedOn, 7) : anchor;
    return formatLocalDate(next);
  }

  const monthsFromAnchor = lastPostedOn
    ? (lastPostedOn.getFullYear() - anchor.getFullYear()) * 12 + (lastPostedOn.getMonth() - anchor.getMonth()) + 1
    : 0;
  return formatLocalDate(addMonthsClamped(anchor, monthsFromAnchor));
}

/**
 * Every occurrence of `rule` that's due (on or before `today`, local calendar day) and
 * hasn't been posted yet, oldest first. Both `rule`'s dates and `today` are read in local
 * time (never UTC), so a call near midnight lands on the correct local day. An empty result
 * means nothing is due yet, including a rule whose anchor is still in the future.
 */
export function dueOccurrences(rule: RecurringOccurrenceRule, today: Date): string[] {
  const anchor = parseLocalDate(rule.anchorDate);
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastPostedOn = rule.lastPostedOn ? parseLocalDate(rule.lastPostedOn) : null;
  const dates: string[] = [];

  if (rule.frequency === 'weekly') {
    let next = lastPostedOn ? addDays(lastPostedOn, 7) : anchor;
    while (next <= todayLocal && dates.length < MAX_OCCURRENCES_PER_CALL) {
      dates.push(formatLocalDate(next));
      next = addDays(next, 7);
    }
    return dates;
  }

  // Monthly: `lastPostedOn` was itself produced by `addMonthsClamped(anchor, k)` for some k
  // (months strictly advance, so that k is unique) — recover it from the month/year
  // difference rather than tracking a separate counter in the stored rule.
  let monthsFromAnchor = lastPostedOn
    ? (lastPostedOn.getFullYear() - anchor.getFullYear()) * 12 + (lastPostedOn.getMonth() - anchor.getMonth()) + 1
    : 0;
  while (dates.length < MAX_OCCURRENCES_PER_CALL) {
    const occurrence = addMonthsClamped(anchor, monthsFromAnchor);
    if (occurrence > todayLocal) break;
    dates.push(formatLocalDate(occurrence));
    monthsFromAnchor += 1;
  }
  return dates;
}
