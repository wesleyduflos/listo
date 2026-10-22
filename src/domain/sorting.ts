import { isLate } from './horizons';
import type { Task } from './types';

/** Late first, then priority, then deadline (undated last), then manual order. */
export function compareTasks(a: Task, b: Task, now: Date): number {
  const la = isLate(a, now) ? 0 : 1;
  const lb = isLate(b, now) ? 0 : 1;
  if (la !== lb) return la - lb;
  if (a.priority !== b.priority) return a.priority - b.priority;
  const da = a.dueAt ? a.dueAt.getTime() : Infinity;
  const db = b.dueAt ? b.dueAt.getTime() : Infinity;
  if (da !== db) return da - db;
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function sortTasks(tasks: Task[], now: Date): Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, now));
}
