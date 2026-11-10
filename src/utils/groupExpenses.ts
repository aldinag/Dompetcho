import { Expense } from '../types';
import { formatDayHeader } from './format';
import { localDayKey } from './timestamp';

export interface DaySection {
  title: string;
  isoDate: string;
  subtotal: number;
  data: Expense[];
}

/** Groups expenses into local-calendar-day sections, in the order they're first seen. */
export function groupByDay(expenses: Expense[]): DaySection[] {
  const sections: DaySection[] = [];
  const indexByDate = new Map<string, number>();

  for (const expense of expenses) {
    const dayKey = localDayKey(expense.date);
    let index = indexByDate.get(dayKey);
    if (index === undefined) {
      index = sections.length;
      indexByDate.set(dayKey, index);
      sections.push({ title: formatDayHeader(expense.date), isoDate: dayKey, subtotal: 0, data: [] });
    }
    sections[index].data.push(expense);
    // Net for the day — income adds, expense subtracts — now that both exist.
    sections[index].subtotal += expense.type === 'income' ? Number(expense.amount) : -Number(expense.amount);
  }

  return sections;
}
