import { endOfDayTz, endOfMonthTz, endOfWeekTz } from './time';
import type { Group, Horizon, Task } from './types';

export const DEFAULT_UNDATED_HORIZON: Horizon = 'week';

export function isLate(task: Pick<Task, 'status' | 'dueAt'>, now: Date): boolean {
  return task.status === 'open' && task.dueAt !== null && task.dueAt.getTime() < now.getTime();
}

/** Group of a deadline relative to now (assumes the deadline is not passed). */
export function groupForDate(date: Date, now: Date): Exclude<Group, 'late' | 'someday'> {
  const t = date.getTime();
  if (t <= endOfDayTz(now).getTime()) return 'today';
  if (t <= endOfWeekTz(now).getTime()) return 'week';
  if (t <= endOfMonthTz(now).getTime()) return 'month';
  return 'later';
}

/**
 * Display group of a task. Dated tasks are placed from their deadline; undated tasks
 * use their manually chosen horizon. A flexible recurrence that is not yet "available"
 * is parked in "later".
 */
export function effectiveHorizon(task: Task, now: Date): Group {
  if (isLate(task, now)) return 'late';
  if (task.availableAt && task.availableAt.getTime() > now.getTime()) return 'later';
  if (task.dueAt) return groupForDate(task.dueAt, now);
  return task.horizon ?? DEFAULT_UNDATED_HORIZON;
}

export const GROUP_ORDER: Group[] = ['late', 'today', 'week', 'month', 'later', 'someday'];
