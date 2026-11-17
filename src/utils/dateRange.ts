export interface MonthRange {
  start: number; // epoch ms of local midnight on the 1st, inclusive
  end: number; // epoch ms of local midnight on the next month's 1st, exclusive
  label: string;
}

export function currentMonthRange(): MonthRange {
  return monthRangeOffset(0);
}

/** The `monthsBack`-th month before the current one (0 = current month). */
export function monthRangeOffset(monthsBack: number): MonthRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  return {
    start: start.getTime(),
    end: end.getTime(),
    label: start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  };
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}
