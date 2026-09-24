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
  } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Add: undefined;
  Summary: undefined;
};
