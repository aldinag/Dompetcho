import { Account, Category, Expense } from '../../types';
import { buildExpenseCsv } from '../csvExport';

function category(overrides: Partial<Category> = {}): Category {
  return { id: 'cat-food', user_id: 'user-1', name: 'Food', icon: 'food', is_default: true, ...overrides };
}

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'Dompet',
    kind: 'cash',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    amount: 10_000,
    category_id: 'cat-food',
    account_id: null,
    note: null,
    date: '2026-09-15T12:00:00.000Z',
    source: 'manual',
    type: 'expense',
    created_at: '2026-09-15T12:00:00.000Z',
    category: category(),
    account: null,
    ...overrides,
  };
}

describe('buildExpenseCsv', () => {
  it('returns null for a month with no expenses, instead of a header-only CSV', () => {
    expect(buildExpenseCsv([])).toBeNull();
  });

  it('builds a header row plus one row per expense', () => {
    const csv = buildExpenseCsv([expense()]);

    const lines = csv!.split('\r\n');
    expect(lines[0]).toBe('Tanggal,Tipe,Kategori,Akun,Jumlah,Catatan');
    expect(lines[1]).toBe('2026-09-15,Pengeluaran,Makanan,Tanpa Akun,10000,');
  });

  it('labels income rows and uses the tagged account name when present', () => {
    const csv = buildExpenseCsv([expense({ type: 'income', account: account({ name: 'Bank Mandiri' }) })]);

    const row = csv!.split('\r\n')[1];
    expect(row).toContain('Pemasukan');
    expect(row).toContain('Bank Mandiri');
  });

  it('falls back to "Lainnya" for an uncategorized expense', () => {
    const csv = buildExpenseCsv([expense({ category_id: null, category: null })]);

    expect(csv!.split('\r\n')[1]).toContain('Lainnya');
  });

  it('quotes a note containing a comma', () => {
    const csv = buildExpenseCsv([expense({ note: 'makan siang, kopi' })]);

    expect(csv).toContain('"makan siang, kopi"');
  });

  it('quotes a note containing a double quote, doubling it per CSV escaping rules', () => {
    const csv = buildExpenseCsv([expense({ note: 'katanya "gratis"' })]);

    expect(csv).toContain('"katanya ""gratis"""');
  });

  it('quotes a note containing a newline', () => {
    const csv = buildExpenseCsv([expense({ note: 'baris satu\nbaris dua' })]);

    expect(csv).toContain('"baris satu\nbaris dua"');
  });

  it('leaves a plain note unquoted', () => {
    const csv = buildExpenseCsv([expense({ note: 'makan siang' })]);

    expect(csv!.split('\r\n')[1].endsWith(',makan siang')).toBe(true);
  });
});
