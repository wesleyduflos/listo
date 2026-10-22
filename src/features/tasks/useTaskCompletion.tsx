import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Task } from '../../domain/types';
import { useActions } from '../../data/DataProvider';
import { useSnackbar } from '../../ui';

/** Delay that lets the user see the check before the row slides to "terminées" (§8.4). */
export const LEAVE_DELAY_MS = 600;

interface CompletionApi {
  complete: (task: Task) => void;
  reopen: (task: Task) => void;
  isLeaving: (id: string) => boolean;
}

const CompletionContext = createContext<CompletionApi | null>(null);

export function TaskCompletionProvider({ children }: { children: ReactNode }) {
  const actions = useActions();
  const snackbar = useSnackbar();
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, number>());

  const complete = useCallback(
    (task: Task) => {
      setLeaving((s) => new Set(s).add(task.id));
      const timer = window.setTimeout(() => {
        timers.current.delete(task.id);
        const nextId = actions.completeTask(task);
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(task.id);
          return n;
        });
        snackbar.show({
          message: `« ${task.title} » terminée`,
          actionLabel: 'Annuler',
          onAction: () => actions.reopenTask(task, nextId),
        });
      }, LEAVE_DELAY_MS);
      timers.current.set(task.id, timer);
    },
    [actions, snackbar],
  );

  const reopen = useCallback(
    (task: Task) => {
      const pendingTimer = timers.current.get(task.id);
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
        timers.current.delete(task.id);
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(task.id);
          return n;
        });
        return;
      }
      actions.reopenTask(task);
    },
    [actions],
  );

  const api = useMemo(
    () => ({ complete, reopen, isLeaving: (id: string) => leaving.has(id) }),
    [complete, reopen, leaving],
  );
  return <CompletionContext.Provider value={api}>{children}</CompletionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTaskCompletion(): CompletionApi {
  const ctx = useContext(CompletionContext);
  if (!ctx) throw new Error('useTaskCompletion outside TaskCompletionProvider');
  return ctx;
}
