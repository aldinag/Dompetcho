import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';

/**
 * Posts due recurring transactions once per app foreground — on initial mount while signed
 * in, and again every time `AppState` transitions into 'active' from something else (never
 * repeatedly while already active, which `AppState`'s 'change' event can otherwise fire for
 * on some platforms). `runningRef` also guards against a slow call still being in flight when
 * another foreground transition fires before it resolves.
 */
export function useRecurringPosting() {
  const user = useAuthStore(state => state.user);
  const postDueRecurring = useExpenseStore(state => state.postDueRecurring);
  const [message, setMessage] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    async function run() {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const postedCount = await postDueRecurring();
        if (postedCount > 0) {
          setMessage(`${postedCount} transaksi berulang ditambahkan`);
        }
      } catch (error) {
        console.warn('Gagal memposting transaksi berulang', error);
      } finally {
        runningRef.current = false;
      }
    }

    run();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current !== 'active' && nextState === 'active') run();
      appState.current = nextState;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  return { message, dismiss: () => setMessage(null) };
}
