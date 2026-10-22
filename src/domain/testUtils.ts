import { makeDateTz } from './time';
import type { Task } from './types';

/** Thursday 22 Oct 2026, 10:00 Paris. */
export const NOW = makeDateTz(2026, 10, 22, 10, 0);

export const at = (month: number, day: number, hh = 12, mm = 0) =>
  makeDateTz(2026, month, day, hh, mm);

let seq = 0;
export function makeTask(p: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Task ${seq}`,
    notes: null,
    status: 'open',
    priority: 2,
    estimateMin: null,
    dueAt: null,
    dueHasTime: false,
    horizon: 'week',
    checklist: [],
    sourceListId: null,
    prepId: null,
    prepStepId: null,
    recurrence: null,
    seriesId: null,
    availableAt: null,
    order: seq,
    createdAt: at(10, 1),
    updatedAt: at(10, 1),
    lastTouchedAt: at(10, 1),
    completedAt: null,
    abandonedAt: null,
    ...p,
  };
}
