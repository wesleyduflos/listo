import {
  ageLabel,
  dueLabel,
  formatDuration,
  lateLabel,
  recurrenceLabel,
  shortDay,
} from '../../domain/format';
import { isLate } from '../../domain/horizons';
import { calendarDiff, isSameDayTz, partsTz, timeOfDay } from '../../domain/time';
import type { Task } from '../../domain/types';

export interface MetaPart {
  text: string;
  mono?: boolean;
}

export type MetaContext = 'today' | 'horizons' | 'prep' | 'done';

/** Secondary line of a task row, adapted to where the row is shown. */
export function taskMeta(
  task: Task,
  now: Date,
  context: MetaContext,
  prepName?: string,
): MetaPart[] {
  const parts: MetaPart[] = [];
  const checklistDone = task.checklist.filter((c) => c.done).length;

  if (isLate(task, now)) {
    parts.push({ text: `En retard · ${lateLabel(task.dueAt!, now)}` });
  } else if (context === 'today') {
    if (prepName) parts.push({ text: prepName });
    else if (task.dueAt && isSameDayTz(task.dueAt, now)) {
      if (task.dueHasTime) parts.push({ text: `Avant ${timeOfDay(task.dueAt)}` });
    } else if (task.dueAt) parts.push({ text: `Avant ${shortDay(task.dueAt)}` });
    else if (task.recurrence) parts.push({ text: recurrenceLabel(task.recurrence)! });
  } else if (context === 'horizons') {
    if (task.recurrence?.mode === 'flex' && task.dueAt) {
      parts.push({
        text: `${recurrenceLabel(task.recurrence)} · prévu vers le ${partsTz(task.dueAt).day}`,
      });
    } else if (task.dueAt) {
      parts.push({ text: `Échéance ${dueLabel(task, now)}` });
      if (task.recurrence) parts.push({ text: recurrenceLabel(task.recurrence)! });
    } else if (task.recurrence) {
      parts.push({ text: recurrenceLabel(task.recurrence)! });
    }
    if (prepName) parts.push({ text: prepName });
  } else if (context === 'done' && task.completedAt) {
    parts.push({ text: `Faite à ${timeOfDay(task.completedAt)}` });
  }

  if (task.checklist.length) {
    if (context === 'horizons' && !task.dueAt && checklistDone === 0) {
      parts.push({
        text: `${task.checklist.length} sous-tâche${task.checklist.length > 1 ? 's' : ''}`,
      });
    } else {
      parts.push({ text: `${checklistDone}/${task.checklist.length}`, mono: true });
    }
  }
  if (task.estimateMin) parts.push({ text: formatDuration(task.estimateMin), mono: true });
  if (context === 'horizons' && !task.dueAt && !task.recurrence) {
    const age = ageLabel(task.createdAt, now);
    const text = calendarDiff(now, task.createdAt) <= 0 ? "Ajoutée aujourd'hui" : `Ajoutée ${age}`;
    parts.push({ text: parts.length ? text.charAt(0).toLowerCase() + text.slice(1) : text });
  }
  return parts;
}
