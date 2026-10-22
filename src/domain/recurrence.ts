import { addDaysTz, addMonthsTz, endOfDayTz, startOfDayTz } from './time';
import type { Recurrence, Task } from './types';

export interface NextOccurrence {
  dueAt: Date;
  dueHasTime: boolean;
  availableAt: Date | null;
}

function step(d: Date, r: Extract<Recurrence, { mode: 'fixed' }>): Date {
  if (r.unit === 'day') return addDaysTz(d, r.every);
  if (r.unit === 'week') return addDaysTz(d, r.every * 7);
  return addMonthsTz(d, r.every);
}

/**
 * Next occurrence of a recurring task completed at `completedAt`.
 * - fixed: from the previous deadline (or completion if undated), skipping occurrences
 *   that would already be late;
 * - flex: deadline = completion + maxDays (end of day), shown from completion + minDays.
 */
export function nextOccurrence(
  task: Pick<Task, 'recurrence' | 'dueAt' | 'dueHasTime'>,
  completedAt: Date,
): NextOccurrence | null {
  const r = task.recurrence;
  if (!r) return null;
  if (r.mode === 'fixed') {
    if (r.every < 1) return null;
    const hasTime = task.dueAt ? task.dueHasTime : false;
    let due = task.dueAt ?? endOfDayTz(completedAt);
    do {
      due = step(due, r);
    } while (due.getTime() <= completedAt.getTime());
    return { dueAt: hasTime ? due : endOfDayTz(due), dueHasTime: hasTime, availableAt: null };
  }
  const min = Math.max(0, Math.min(r.minDays, r.maxDays));
  const max = Math.max(r.minDays, r.maxDays, 1);
  return {
    dueAt: endOfDayTz(addDaysTz(completedAt, max)),
    dueHasTime: false,
    availableAt: min > 0 ? startOfDayTz(addDaysTz(completedAt, min)) : null,
  };
}
