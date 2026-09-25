export type ExpenseSource = 'manual' | 'receipt_ocr';

export type TransactionType = 'income' | 'expense';

export type BankDetected = 'mandiri' | 'unrecognized';

export type ReceiptScanStatus = 'pending_review' | 'confirmed' | 'discarded';

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

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  note: string | null;
  date: string; // ISO timestamp of when it happened (timestamptz)
  source: ExpenseSource;
  type: TransactionType;
  created_at: string;
  category?: Category | null;
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
  status: ReceiptScanStatus;
  created_at: string;
}
