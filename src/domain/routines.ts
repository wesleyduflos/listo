import { addDaysTz, dayKey, fromDayKey, isoWeekdayTz } from './time';
import type { Routine, RoutineDay } from './types';

export function routinesForDay(routines: Routine[], day: Date): Routine[] {
  const wd = isoWeekdayTz(day);
  return routines
    .filter((r) => r.active && r.weekdays.includes(wd))
    .sort((a, b) => a.order - b.order);
}

export function isDayComplete(d: RoutineDay | undefined): boolean {
  return !!d && d.planned.length > 0 && d.planned.every((id) => d.done.includes(id));
}

export interface Streak {
  current: number;
  best: number;
}

/**
 * Streak = consecutive days where every planned routine was done. Days with nothing
 * planned (or no record) are neutral. Today only counts once complete; an incomplete
 * today does not break the running streak.
 */
export function computeStreak(days: Record<string, RoutineDay>, today: Date): Streak {
  const todayKey = dayKey(today);
  const keys = Object.keys(days)
    .filter((k) => k <= todayKey)
    .sort();
  let best = 0;
  let run = 0;
  for (const k of keys) {
    const d = days[k];
    if (d.planned.length === 0) continue;
    if (isDayComplete(d)) {
      run += 1;
      best = Math.max(best, run);
    } else if (k !== todayKey) {
      run = 0;
    }
  }
  return { current: run, best };
}

/** Keys of the days strictly between the last recorded day and today (max `cap`). */
export function missingDayKeys(lastKey: string | null, today: Date, cap = 60): string[] {
  if (!lastKey) return [];
  const out: string[] = [];
  let d = addDaysTz(fromDayKey(lastKey), 1);
  const todayKey = dayKey(today);
  while (dayKey(d) < todayKey && out.length < cap) {
    out.push(dayKey(d));
    d = addDaysTz(d, 1);
  }
  return out;
}
