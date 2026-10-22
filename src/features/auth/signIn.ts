import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, useEmulators } from '../../lib/firebase';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/** Popup first (works in iOS standalone PWAs); redirect when popups are blocked. */
export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

/** Emulator only: signs in a fake Google account without any popup. */
export async function signInTestUser(): Promise<void> {
  if (!useEmulators) return;
  const token = JSON.stringify({
    sub: 'listo-test-user',
    email: 'test@listo.local',
    email_verified: true,
    name: 'Test Listo',
  });
  await signInWithCredential(auth, GoogleAuthProvider.credential(token));
}
