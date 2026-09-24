// Transactions carry a full timestamp (an absolute instant, stored as timestamptz), never a
// "yyyy-MM-dd" string derived through UTC — that's what shifted dates by a day in WIB.
// Day/month buckets are derived from the timestamp in the device's local time, at display time.

export function nowTimestamp(): string {
  return new Date().toISOString();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar day of a timestamp, as "yyyy-MM-dd" — for grouping only, never stored. */
export function localDayKey(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar month of a timestamp, as "yyyy-MM" — for grouping only, never stored. */
export function localMonthKey(timestamp: string): string {
  return localDayKey(timestamp).slice(0, 7);
}

/** Local date + "HH:mm" (a receipt's printed date/time) → timestamp. No time → noon, so it can't slip a day. */
export function timestampFromLocal(isoDate: string, time: string | null): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hours, minutes] = (time ?? '12:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

/** Move a timestamp to the picked calendar day (local), keeping its time of day. */
export function withPickedDay(timestamp: string, picked: Date): string {
  const base = new Date(timestamp);
  return new Date(
    picked.getFullYear(),
    picked.getMonth(),
    picked.getDate(),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
  ).toISOString();
}
