import { useEffect } from 'react';
import { setWriteErrorHandler } from '../data/actions';
import { useSnackbar } from '../ui';

const MESSAGES: Record<string, string> = {
  'permission-denied':
    'Accès refusé par Firestore. Vérifiez que les règles de sécurité (firestore.rules) sont publiées.',
  'resource-exhausted': 'Quota Firestore atteint pour aujourd’hui.',
  unauthenticated: 'Session expirée. Reconnectez-vous.',
};

/** Surfaces rejected reads and writes (e.g. security rules) instead of failing silently. */
export function WriteErrors() {
  const snackbar = useSnackbar();
  useEffect(() => {
    setWriteErrorHandler((e) => {
      console.error(e);
      const code = (e as { code?: string })?.code ?? '';
      snackbar.show({
        message:
          MESSAGES[code] ??
          `Une modification n’a pas pu être enregistrée${code ? ` (${code})` : ''}.`,
        durationMs: 8000,
      });
    });
  }, [snackbar]);
  return null;
}
