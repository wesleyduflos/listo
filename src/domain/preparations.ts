import { addDaysTz, atTimeTz, calendarDiff, endOfDayTz, timeOfDay } from './time';
import type { ChecklistItem, ListItem, Preparation, PrepStep, Task } from './types';

export interface StepDue {
  dueAt: Date;
  dueHasTime: boolean;
}

/**
 * Deadline of a step: departure day + offsetDays, at the time hint or end of day.
 * Nothing may be due after the departure itself.
 */
export function stepDue(step: Pick<PrepStep, 'offsetDays' | 'timeHint'>, departAt: Date): StepDue {
  const day = addDaysTz(departAt, step.offsetDays);
  let dueAt = step.timeHint ? atTimeTz(day, step.timeHint) : endOfDayTz(day);
  let dueHasTime = step.timeHint !== null;
  if (dueAt.getTime() > departAt.getTime()) {
    dueAt = departAt;
    dueHasTime = true;
  }
  return { dueAt, dueHasTime };
}

export function checklistFromList(items: ListItem[], newId: () => string): ChecklistItem[] {
  return items.map((it) => ({
    id: newId(),
    label: it.label,
    ...(it.qty ? { qty: it.qty } : {}),
    done: false,
  }));
}

export type StepTaskDraft = Pick<
  Task,
  | 'title'
  | 'priority'
  | 'estimateMin'
  | 'dueAt'
  | 'dueHasTime'
  | 'checklist'
  | 'sourceListId'
  | 'prepStepId'
  | 'order'
>;

export function instantiateSteps(
  steps: PrepStep[],
  departAt: Date,
  lists: Record<string, ListItem[] | undefined>,
  newId: () => string,
): StepTaskDraft[] {
  return steps.map((s, i) => {
    const items = s.listId ? lists[s.listId] : undefined;
    return {
      title: s.title,
      priority: s.priority,
      estimateMin: s.estimateMin,
      ...stepDue(s, departAt),
      checklist: items ? checklistFromList(items, newId) : [],
      sourceListId: items ? s.listId : null,
      prepStepId: s.id,
      order: i,
    };
  });
}

/** Rebuilds template steps from a preparation's tasks (for "Enregistrer comme modèle"). */
export function stepsFromTasks(tasks: Task[], departAt: Date, newId: () => string): PrepStep[] {
  return [...tasks]
    .filter((t) => t.dueAt && t.status !== 'abandoned')
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime() || a.order - b.order)
    .map((t) => {
      const offsetDays = calendarDiff(t.dueAt!, departAt);
      const isDeparture = t.dueAt!.getTime() === departAt.getTime();
      return {
        id: newId(),
        title: t.title,
        offsetDays,
        timeHint: t.dueHasTime && !isDeparture ? timeOfDay(t.dueAt!) : null,
        priority: t.priority,
        estimateMin: t.estimateMin,
        listId: t.sourceListId,
      };
    });
}

/** Relative day of a deadline: 0 = departure day, -1 = day before… */
export function relativeDayIndex(dueAt: Date, departAt: Date): number {
  return calendarDiff(dueAt, departAt);
}

export function relativeDayLabel(offset: number): string {
  if (offset === 0) return 'Jour J';
  return offset < 0 ? `J${offset}` : `J+${offset}`;
}

export interface PrepProgress {
  done: number;
  total: number;
  remainingMin: number;
}

export function prepProgress(tasks: Task[]): PrepProgress {
  const relevant = tasks.filter((t) => t.status !== 'abandoned');
  const open = relevant.filter((t) => t.status === 'open');
  return {
    done: relevant.length - open.length,
    total: relevant.length,
    remainingMin: open.reduce((s, t) => s + (t.estimateMin ?? 0), 0),
  };
}

export function isPrepActive(prep: Preparation, now: Date): boolean {
  return prep.status === 'active' && prep.departAt.getTime() > now.getTime();
}

export interface PrepDay {
  offset: number;
  day: Date;
  tasks: Task[];
}

export function prepTimeline(tasks: Task[], departAt: Date): PrepDay[] {
  const byOffset = new Map<number, Task[]>();
  for (const t of tasks) {
    if (!t.dueAt || t.status === 'abandoned') continue;
    const o = relativeDayIndex(t.dueAt, departAt);
    byOffset.set(o, [...(byOffset.get(o) ?? []), t]);
  }
  return [...byOffset.entries()]
    .sort(([a], [b]) => a - b)
    .map(([offset, list]) => ({
      offset,
      day: addDaysTz(departAt, offset),
      tasks: list.sort(
        (a, b) => a.dueAt!.getTime() - b.dueAt!.getTime() || a.order - b.order,
      ),
    }));
}
