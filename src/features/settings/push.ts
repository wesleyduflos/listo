import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, vapidKey } from '../../lib/firebase';

const TOKEN_KEY = 'listo.fcmToken';

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode: the token is still saved in Firestore.
  }
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function pushSupported(): Promise<boolean> {
  return (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    (await isSupported().catch(() => false))
  );
}

/** Asks for permission and returns this device's FCM token, sharing the PWA service worker. */
export async function enablePush(): Promise<string> {
  if (!(await pushSupported())) throw new Error('unsupported');
  if (!vapidKey) throw new Error('missing-vapid-key');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  storeToken(token);
  return token;
}

/** Refreshes the token silently when permission was already granted. */
export async function refreshPushToken(): Promise<string | null> {
  if (!vapidKey || !(await pushSupported()) || Notification.permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  storeToken(token);
  return token;
}

export async function disablePush(): Promise<string | null> {
  const token = storedToken();
  storeToken(null);
  if (await pushSupported()) await deleteToken(getMessaging(app)).catch(() => undefined);
  return token;
}
