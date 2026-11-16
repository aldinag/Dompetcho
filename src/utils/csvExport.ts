import { categoryLabel } from '../constants/categoryLabels';
import { Expense } from '../types';
import { localDayKey } from './timestamp';

const CSV_HEADER = ['Tanggal', 'Tipe', 'Kategori', 'Akun', 'Jumlah', 'Catatan'];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(expense: Expense): string[] {
  return [
    localDayKey(expense.date),
    expense.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    categoryLabel(expense.category?.name),
    expense.account?.name ?? 'Tanpa Akun',
    String(Math.round(expense.amount)),
    expense.note ?? '',
  ];
}

// Returns null for an empty month instead of a header-only CSV, so the caller can show a
// message rather than sharing a file with nothing in it.
export function buildExpenseCsv(expenses: Expense[]): string | null {
  if (expenses.length === 0) return null;
  const rows = [CSV_HEADER, ...expenses.map(toRow)];
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
}
