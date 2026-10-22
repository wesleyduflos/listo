import { calendarDiff, formatTz, timeOfDay } from './time';
import type { Recurrence, Task } from './types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "sam. 24" */
export const shortDay = (d: Date) => formatTz(d, 'EEE d');
/** "sam. 24 oct." */
export const shortDate = (d: Date) => formatTz(d, 'EEE d MMM');
/** "Jeudi 22 octobre" */
export const longDate = (d: Date) => cap(formatTz(d, 'EEEE d MMMM'));

/** "25 min", "1 h", "1 h 10" */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** "1 j 7 h", "5 h 20 min", "12 min" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'parti';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/** Relative day label: "aujourd'hui", "demain", "hier", or "sam. 24". */
export function relativeDay(d: Date, now: Date): string {
  const diff = calendarDiff(d, now);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  if (diff > 1 && diff < 7) return shortDay(d);
  return shortDate(d);
}

export function dueLabel(task: Pick<Task, 'dueAt' | 'dueHasTime'>, now: Date): string | null {
  if (!task.dueAt) return null;
  const day = relativeDay(task.dueAt, now);
  return task.dueHasTime ? `${day} ${timeOfDay(task.dueAt)}` : day;
}

export function lateLabel(dueAt: Date, now: Date): string {
  const diff = calendarDiff(now, dueAt);
  if (diff <= 0) return `échéance ${timeOfDay(dueAt)}`;
  if (diff === 1) return 'échéance hier';
  return `échéance il y a ${diff} j`;
}

export function lateSinceLabel(dueAt: Date, now: Date): string {
  const diff = calendarDiff(now, dueAt);
  if (diff <= 0) return "En retard depuis aujourd'hui";
  if (diff === 1) return 'En retard depuis hier';
  return `En retard depuis ${diff} j`;
}

export function recurrenceLabel(r: Recurrence): string | null {
  if (!r) return null;
  if (r.mode === 'fixed') {
    const unit = { day: 'jour', week: 'semaine', month: 'mois' }[r.unit];
    if (r.every === 1) return r.unit === 'week' ? 'Chaque semaine' : `Chaque ${unit}`;
    const plural = r.unit === 'month' ? 'mois' : `${unit}s`;
    return `Tous les ${r.every} ${plural}`;
  }
  if (r.minDays % 7 === 0 && r.maxDays % 7 === 0) {
    return `Récurrent ~ ${r.minDays / 7}–${r.maxDays / 7} sem.`;
  }
  return `Récurrent ~ ${r.minDays}–${r.maxDays} j`;
}

export function ageLabel(since: Date, now: Date): string {
  const d = calendarDiff(now, since);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  return `il y a ${d} j`;
}
