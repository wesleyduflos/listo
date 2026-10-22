import { effectiveHorizon, GROUP_ORDER } from './horizons';
import { sortTasks } from './sorting';
import { isSameDayTz } from './time';
import type { Group, Task } from './types';

export function groupTasks(tasks: Task[], now: Date): Record<Group, Task[]> {
  const groups = Object.fromEntries(GROUP_ORDER.map((g) => [g, [] as Task[]])) as Record<
    Group,
    Task[]
  >;
  for (const t of tasks) {
    if (t.status !== 'open') continue;
    groups[effectiveHorizon(t, now)].push(t);
  }
  for (const g of GROUP_ORDER) groups[g] = sortTasks(groups[g], now);
  return groups;
}

export function completedToday(tasks: Task[], now: Date): Task[] {
  return tasks
    .filter((t) => t.status === 'done' && t.completedAt && isSameDayTz(t.completedAt, now))
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
}

export interface TodayView {
  late: Task[];
  /** Open non-preparation tasks for today. */
  today: Task[];
  /** Open preparation steps due today. */
  prepToday: Task[];
  done: Task[];
  total: number;
  doneCount: number;
}

/**
 * Ring total = open tasks that are late or due today (preparation steps included)
 * plus every task completed today.
 */
export function todayView(tasks: Task[], now: Date): TodayView {
  const g = groupTasks(tasks, now);
  const done = completedToday(tasks, now);
  const today = g.today.filter((t) => !t.prepId);
  const prepToday = g.today.filter((t) => t.prepId);
  return {
    late: g.late,
    today,
    prepToday,
    done,
    total: g.late.length + g.today.length + done.length,
    doneCount: done.length,
  };
}

export function sumEstimates(tasks: Task[]): number {
  return tasks.reduce((s, t) => s + (t.estimateMin ?? 0), 0);
}
