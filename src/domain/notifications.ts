import { formatDuration } from './format';
import { sumEstimates, todayView } from './grouping';
import { minutesOfDay } from './time';
import type { Task } from './types';

export interface PushMessage {
  title: string;
  body: string;
  link: string;
}

const MAX_LINES = 5;

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n > 1 ? pluralWord : word}`;
}

/** Morning: count + estimated time in the title, P1 and late tasks listed in the body. */
export function buildMorningMessage(tasks: Task[], now: Date): PushMessage | null {
  const v = todayView(tasks, now);
  const open = [...v.late, ...v.today, ...v.prepToday];
  if (open.length === 0) return null;
  const minutes = sumEstimates(open);
  const title = `Aujourd'hui · ${plural(open.length, 'tâche')}${minutes ? ` · ${formatDuration(minutes)}` : ''}`;
  const highlighted = open.filter((t) => v.late.includes(t) || t.priority === 1);
  const lines = highlighted.slice(0, MAX_LINES).map((t) => (v.late.includes(t) ? `${t.title} (en retard)` : t.title));
  if (highlighted.length > MAX_LINES) lines.push(`+ ${highlighted.length - MAX_LINES} autres`);
  return {
    title,
    body: lines.length ? lines.join('\n') : 'Aucune urgence. Bonne journée.',
    link: '/',
  };
}

export function buildEveningMessage(
  tasks: Task[],
  now: Date,
  congratsEnabled: boolean,
): PushMessage | null {
  const v = todayView(tasks, now);
  if (v.total === 0) return null;
  const pending = v.total - v.doneCount;
  if (pending === 0) {
    if (!congratsEnabled) return null;
    return { title: 'Journée bouclée', body: `${plural(v.doneCount, 'tâche')} faites aujourd'hui.`, link: '/bilan' };
  }
  return {
    title: `Bilan · ${v.doneCount}/${v.total} bouclées`,
    body: `${plural(pending, 'tâche')} à décider`,
    link: '/bilan',
  };
}

/**
 * A slot is due when its time has passed today, it was not sent today, and we are
 * still within the catch-up window (so a missed run never sends a morning push at 4 pm).
 */
export function isSlotDue(
  slotTime: string,
  now: Date,
  lastSentKey: string | null | undefined,
  todayKey: string,
  catchUpMin = 120,
): boolean {
  if (lastSentKey === todayKey) return false;
  const [h, m] = slotTime.split(':').map(Number);
  const slot = h * 60 + m;
  const cur = minutesOfDay(now);
  return cur >= slot && cur < slot + catchUpMin;
}
