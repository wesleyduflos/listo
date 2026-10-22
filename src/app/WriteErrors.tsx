import { useEffect } from 'react';
import { setWriteErrorHandler } from '../data/actions';
import { useSnackbar } from '../ui';

/** Surfaces rejected writes (e.g. security rules) instead of failing silently. */
export function WriteErrors() {
  const snackbar = useSnackbar();
  useEffect(() => {
    setWriteErrorHandler((e) => {
      console.error(e);
      snackbar.show({ message: 'Une modification n’a pas pu être enregistrée.' });
    });
  }, [snackbar]);
  return null;
}
