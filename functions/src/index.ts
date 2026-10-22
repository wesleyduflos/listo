import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
// Shared pure logic: the push content is computed exactly like the app's Today view.
import {
  buildEveningMessage,
  buildMorningMessage,
  isSlotDue,
  type PushMessage,
} from '../../src/domain/notifications.ts';
import { dayKey, startOfDayTz, TZ } from '../../src/domain/time.ts';
import { DEFAULT_SETTINGS, type Settings, type Task } from '../../src/domain/types.ts';

initializeApp();
const db = getFirestore();

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);

function toTask(id: string, d: DocumentData): Task {
  return {
    id,
    title: String(d.title ?? ''),
    notes: d.notes ?? null,
    status: d.status ?? 'open',
    priority: d.priority ?? 2,
    estimateMin: d.estimateMin ?? null,
    dueAt: toDate(d.dueAt),
    dueHasTime: Boolean(d.dueHasTime),
    horizon: d.horizon ?? null,
    checklist: d.checklist ?? [],
    sourceListId: d.sourceListId ?? null,
    prepId: d.prepId ?? null,
    prepStepId: d.prepStepId ?? null,
    recurrence: d.recurrence ?? null,
    seriesId: d.seriesId ?? null,
    availableAt: toDate(d.availableAt),
    order: d.order ?? 0,
    createdAt: toDate(d.createdAt) ?? new Date(0),
    updatedAt: toDate(d.updatedAt) ?? new Date(0),
    lastTouchedAt: toDate(d.lastTouchedAt) ?? new Date(0),
    completedAt: toDate(d.completedAt),
    abandonedAt: toDate(d.abandonedAt),
  };
}

async function loadTasks(uid: string, now: Date): Promise<Task[]> {
  const tasks = db.collection(`users/${uid}/tasks`);
  const [open, done] = await Promise.all([
    tasks.where('status', '==', 'open').get(),
    tasks.where('completedAt', '>=', Timestamp.fromDate(startOfDayTz(now))).get(),
  ]);
  const byId = new Map<string, Task>();
  for (const d of [...open.docs, ...done.docs]) byId.set(d.id, toTask(d.id, d.data()));
  return [...byId.values()];
}

/** Sends to every registered device and removes tokens FCM reports as invalid. */
async function send(uid: string, message: PushMessage): Promise<void> {
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();
  const tokens = snap.docs.map((d) => d.id);
  if (tokens.length === 0) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    webpush: {
      notification: {
        title: message.title,
        body: message.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        lang: 'fr',
      },
      fcmOptions: { link: message.link },
    },
  });
  const invalid = res.responses
    .map((r, i) => ({ r, token: tokens[i] }))
    .filter(({ r }) => {
      const code = r.error?.code ?? '';
      return (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      );
    });
  await Promise.all(invalid.map(({ token }) => db.doc(`users/${uid}/fcmTokens/${token}`).delete()));
  logger.info('push sent', {
    uid,
    title: message.title,
    success: res.successCount,
    removed: invalid.length,
  });
}

export const notify = onSchedule(
  { schedule: 'every 15 minutes', timeZone: TZ, region: 'europe-west1', retryCount: 0 },
  async () => {
    const now = new Date();
    const today = dayKey(now);
    const users = await db.collection('users').get();
    for (const user of users.docs) {
      const settings: Settings = { ...DEFAULT_SETTINGS, ...(user.data().settings ?? {}) };
      if (!settings.notificationsEnabled) continue;
      const markerRef = db.doc(`users/${user.id}/meta/notifications`);
      const marker = (await markerRef.get()).data() ?? {};
      const morning = isSlotDue(settings.morningNotifTime, now, marker.morningSentOn, today);
      const evening = isSlotDue(settings.eveningNotifTime, now, marker.eveningSentOn, today);
      if (!morning && !evening) continue;

      const tasks = await loadTasks(user.id, now);
      // The marker is written first so a crash never results in a double send.
      if (morning) {
        await markerRef.set({ morningSentOn: today }, { merge: true });
        const msg = buildMorningMessage(tasks, now);
        if (msg) await send(user.id, msg);
      }
      if (evening) {
        await markerRef.set({ eveningSentOn: today }, { merge: true });
        const msg = buildEveningMessage(tasks, now, settings.eveningCongratsEnabled);
        if (msg) await send(user.id, msg);
      }
    }
  },
);
