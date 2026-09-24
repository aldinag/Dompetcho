export interface MonthRange {
  start: number; // epoch ms of local midnight on the 1st, inclusive
  end: number; // epoch ms of local midnight on the next month's 1st, exclusive
  label: string;
}

export function currentMonthRange(): MonthRange {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    label: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  };
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}
