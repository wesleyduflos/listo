import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Snackbar.module.css';

export interface SnackOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface SnackbarApi {
  show: (o: SnackOptions) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<(SnackOptions & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((o: SnackOptions) => {
    window.clearTimeout(timer.current);
    setSnack({ ...o, key: Date.now() });
    timer.current = window.setTimeout(() => setSnack(null), o.durationMs ?? 5000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div className={styles.host} aria-live="polite">
        {snack && (
          <div key={snack.key} className={styles.bar} role="status">
            <span className={styles.message}>{snack.message}</span>
            {snack.actionLabel && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  snack.onAction?.();
                  window.clearTimeout(timer.current);
                  setSnack(null);
                }}
              >
                {snack.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </SnackbarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSnackbar = () => useContext(SnackbarContext);
