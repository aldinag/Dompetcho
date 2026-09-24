import { useCallback } from 'react';
import { Alert } from 'react-native';
import { navigateToExpenseForm } from '../navigation/navigationRef';
import { importReceiptImage } from '../services/receiptImportService';
import { useAuthStore } from '../store/useAuthStore';
import { useImportStore } from '../store/useImportStore';

/** Shared by the share-sheet handler and the in-app "Upload receipt" button. */
export function useReceiptProcessor() {
  const user = useAuthStore(state => state.user);
  const setProcessing = useImportStore(state => state.setProcessing);

  return useCallback(
    async (imageUri: string) => {
      if (!user) return;
      setProcessing(true);
      try {
        const scan = await importReceiptImage(user.id, imageUri);
        navigateToExpenseForm({
          receiptScanId: scan.id,
          imageUri,
          bankDetected: scan.bank_detected,
          prefill:
            scan.bank_detected === 'mandiri'
              ? {
                  amount: scan.parsed_amount,
                  date: scan.parsed_date,
                  recipientName: scan.parsed_recipient,
                  referenceNo: scan.parsed_reference_no,
                }
              : undefined,
        });
      } catch (error: any) {
        Alert.alert('Gagal membaca struk', error?.message ?? 'Silakan coba lagi atau tambahkan pengeluaran secara manual.');
      } finally {
        setProcessing(false);
      }
    },
    [user, setProcessing],
  );
}
