export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function formatDayHeader(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Hari Ini';
  if (isSameDay(date, yesterday)) return 'Kemarin';

  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
