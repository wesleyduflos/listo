import { calendarDiff } from './time';
import type { Task } from './types';

/** Oldest untouched "someday" task, if it has slept at least `days` days. */
export function somedayNudge(
  tasks: Task[],
  now: Date,
  days: number,
): { task: Task; days: number } | null {
  let best: Task | null = null;
  for (const t of tasks) {
    if (t.status !== 'open' || t.dueAt || t.horizon !== 'someday') continue;
    if (calendarDiff(now, t.lastTouchedAt) < days) continue;
    if (!best || t.lastTouchedAt < best.lastTouchedAt) best = t;
  }
  return best ? { task: best, days: calendarDiff(now, best.lastTouchedAt) } : null;
}
