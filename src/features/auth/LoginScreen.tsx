import { useState } from 'react';
import { firebaseConfigured, useEmulators } from '../../lib/firebase';
import { Button, TextInput } from '../../ui';
import { authErrorMessage } from './authErrors';
import {
  resetPassword,
  signInTestUser,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './signIn';
import styles from './LoginScreen.module.css';

type Mode = 'signIn' | 'signUp';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(navigator.onLine ? authErrorMessage(e) : 'Connexion impossible hors ligne.');
    } finally {
      setBusy(false);
    }
  };

  const forgot = () => {
    if (!email.trim()) {
      setError('Saisissez votre adresse e-mail pour recevoir le lien.');
      return;
    }
    run(async () => {
      await resetPassword(email);
      setInfo(
        `Si un compte existe pour ${email.trim()}, un e-mail de réinitialisation vient d’être envoyé.`,
      );
    });
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
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              run(() => (mode === 'signIn' ? signInWithEmail : signUpWithEmail)(email, password));
            }}
          >
            <TextInput
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextInput
              label="Mot de passe"
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              minLength={mode === 'signUp' ? 6 : undefined}
              hint={mode === 'signUp' ? '6 caractères minimum.' : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className={styles.info} role="status">
                {info}
              </p>
            )}
            <Button type="submit" size="lg" block disabled={busy}>
              {mode === 'signIn' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
            <div className={styles.links}>
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                  setError(null);
                  setInfo(null);
                }}
              >
                {mode === 'signIn' ? 'Créer un compte' : 'J’ai déjà un compte'}
              </button>
              {mode === 'signIn' && (
                <button type="button" className={styles.link} onClick={forgot} disabled={busy}>
                  Mot de passe oublié ?
                </button>
              )}
            </div>
          </form>

          <div className={styles.divider} aria-hidden="true">
            <span>ou</span>
          </div>

          <Button
            variant="secondary"
            size="lg"
            block
            onClick={() => run(signInWithGoogle)}
            disabled={busy}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            Continuer avec Google
          </Button>
          {useEmulators && (
            <Button variant="ghost" block onClick={() => run(signInTestUser)} disabled={busy}>
              Connexion de test (émulateur)
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
