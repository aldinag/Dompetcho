import { BankDetected } from '../types';

export type ExpenseFormPrefill = {
  amount?: number | null;
  date?: string | null;
  recipientName?: string | null;
  referenceNo?: string | null;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  Profile: undefined;
  ExpenseForm: {
    receiptScanId?: string;
    imageUri?: string;
    bankDetected?: BankDetected;
    prefill?: ExpenseFormPrefill;
    /** Editing an existing expense — its current values are read from the store by id. */
    expenseId?: string;
  } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Add: undefined;
  Summary: undefined;
};
