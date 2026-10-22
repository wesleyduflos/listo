import { useState } from 'react';
import { firebaseConfigured, useEmulators } from '../../lib/firebase';
import { Button } from '../../ui';
import { signInTestUser, signInWithGoogle } from './signIn';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(
          navigator.onLine
            ? 'La connexion a échoué. Réessayez.'
            : 'Connexion impossible hors ligne.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.screen}>
      <div className={styles.brand}>
        <img src="/icons/icon.svg" alt="" width={88} height={88} className={styles.logo} />
        <h1 className={styles.name}>Listo</h1>
        <p className={styles.tagline}>Vos listes, prêtes à temps.</p>
      </div>
      {!firebaseConfigured ? (
        <p className={styles.error}>
          Configuration Firebase manquante. Renseignez les variables <code>VITE_FIREBASE_*</code>{' '}
          (voir <code>.env.example</code>).
        </p>
      ) : (
        <div className={styles.actions}>
          <Button size="lg" block onClick={() => run(signInWithGoogle)} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#fff"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
              />
            </svg>
            Continuer avec Google
          </Button>
          {useEmulators && (
            <Button variant="secondary" block onClick={() => run(signInTestUser)} disabled={busy}>
              Connexion de test (émulateur)
            </Button>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
