import { useCallback } from 'react';
import { Alert } from 'react-native';
import { navigateToExpenseForm } from '../navigation/navigationRef';
import { matchAccountByLabel } from '../services/accountMatching';
import { importReceiptImage } from '../services/receiptImportService';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useImportStore } from '../store/useImportStore';

/** Shared by the share-sheet handler and the in-app "Upload receipt" button. */
export function useReceiptProcessor() {
  const user = useAuthStore(state => state.user);
  const setProcessing = useImportStore(state => state.setProcessing);
  const accounts = useExpenseStore(state => state.accounts);

  return useCallback(
    async (imageUri: string) => {
      if (!user) return;
      setProcessing(true);
      try {
        const { scan, transactionWarning } = await importReceiptImage(user.id, imageUri);
        const matchedAccount = matchAccountByLabel(scan.parsed_account_label, accounts);
        navigateToExpenseForm({
          receiptScanId: scan.id,
          imageUri,
          bankDetected: scan.bank_detected,
          transactionWarning,
          prefill:
            scan.bank_detected === 'mandiri'
              ? {
                  amount: scan.parsed_amount,
                  date: scan.parsed_date,
                  recipientName: scan.parsed_recipient,
                  referenceNo: scan.parsed_reference_no,
                  note: scan.parsed_note,
                  accountId: matchedAccount?.id ?? null,
                }
              : undefined,
        });
      } catch (error: any) {
        Alert.alert('Gagal membaca struk', error?.message ?? 'Silakan coba lagi atau tambahkan pengeluaran secara manual.');
      } finally {
        setProcessing(false);
      }
    },
    [user, setProcessing, accounts],
  );
}
