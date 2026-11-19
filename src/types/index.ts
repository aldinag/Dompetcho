export type ExpenseSource = 'manual' | 'receipt_ocr' | 'recurring';

export type TransactionType = 'income' | 'expense';

export type BankDetected = 'mandiri' | 'gojek' | 'grab' | 'unrecognized';

export type ReceiptScanStatus = 'pending_review' | 'confirmed' | 'discarded';

export type AccountKind = 'bank' | 'ewallet' | 'cash';

export type RecurringFrequency = 'weekly' | 'monthly';

export interface AppUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  google_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  is_default: boolean;
}

// A source/payment-method tag, not a wallet — no per-account balance is tracked or derived
// from this. Home's "Sisa Saldo" stays one overall number regardless of account tagging.
export interface Account {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  created_at: string;
}

// A monthly spending limit for one category — display-only, see schema.sql's
// `category_budgets` comment for the non-goal this is the one approved exception to.
export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string | null;
  date: string; // ISO timestamp of when it happened (timestamptz)
  source: ExpenseSource;
  type: TransactionType;
  recurring_id: string | null;
  occurrence_date: string | null; // "yyyy-MM-dd", set only when source is 'recurring'
  created_at: string;
  category?: Category | null;
  account?: Account | null;
}

// A weekly/monthly rule the app posts as a normal expense/income row when due — see
// schema.sql's `recurring_transactions` comment for the non-goal this is the approved
// exception to. `anchor_date` is the rule's first occurrence; `last_posted_on` is the most
// recent occurrence actually posted (null until the posting step, added later, runs once).
export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  anchor_date: string; // "yyyy-MM-dd"
  last_posted_on: string | null; // "yyyy-MM-dd"
  is_active: boolean;
  created_at: string;
}

export interface ReceiptScan {
  id: string;
  user_id: string;
  expense_id: string | null;
  raw_ocr_text: string | null;
  image_uri: string | null;
  bank_detected: BankDetected;
  parsed_amount: number | null;
  parsed_date: string | null;
  parsed_recipient: string | null;
  parsed_reference_no: string | null;
  parsed_note: string | null;
  parsed_account_label: string | null;
  status: ReceiptScanStatus;
  created_at: string;
}
