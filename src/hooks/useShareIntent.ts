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
        // NOT calling clearReceivedFiles() here — it sets a permanent `isClear` flag on
        // the library's singleton that is never reset, which silently blocks every
        // future share for the rest of the app's process lifetime (confirmed by reading
        // node_modules/react-native-receive-sharing-intent's source: the AppState 'active'
        // listener that re-checks for a new share is gated by `!this.isClear` with no way
        // to un-set it). The native Android side already handles this correctly on its
        // own — MainActivity.onNewIntent updates the activity's intent, and the module's
        // getFileNames() calls `mActivity.setIntent(null)` right after reading it — so a
        // stray foreground with no new share just resolves to nothing instead of
        // reprocessing stale data. No JS-side latch is needed.
      },
      (error: unknown) => console.warn('Share intent error', error),
    );

    // getReceivedFiles adds a new AppState listener on every call — run this exactly
    // once per signed-in session, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);
}
