import { useEffect } from 'react';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeFileUri } from '../utils/fileUri';
import { useReceiptProcessor } from './useReceiptProcessor';

interface SharedFile {
  filePath: string | null;
  mimeType: string | null;
}

/** Handles an image shared into Dompetcho from the Android share sheet (Gallery, WhatsApp, Livin'). */
export function useShareIntent() {
  const user = useAuthStore(state => state.user);
  const processReceiptImage = useReceiptProcessor();

  useEffect(() => {
    if (!user) return;

    ReceiveSharingIntent.getReceivedFiles(
      (files: SharedFile[]) => {
        const image = files.find(f => f.filePath && f.mimeType?.startsWith('image'));
        if (!image?.filePath) return;
        processReceiptImage(normalizeFileUri(image.filePath));
        ReceiveSharingIntent.clearReceivedFiles();
      },
      (error: unknown) => console.warn('Share intent error', error),
    );

    // getReceivedFiles adds a new AppState listener on every call — run this exactly
    // once per signed-in session, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);
}
