import { Timestamp, type DocumentData } from 'firebase/firestore';
import type {
  Horizon,
  Preparation,
  PrepTemplate,
  Priority,
  ReusableList,
  Routine,
  RoutineDay,
  Settings,
  Task,
} from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';

export const toDate = (v: unknown): Date | null =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null;
const toDateOr = (v: unknown, fallback: Date) => toDate(v) ?? fallback;
export const ts = (d: Date | null | undefined) => (d ? Timestamp.fromDate(d) : null);

const EPOCH = new Date(0);
const HORIZONS: Horizon[] = ['today', 'week', 'month', 'someday'];

export function taskFromDoc(id: string, d: DocumentData): Task {
  return {
    id,
    title: String(d.title ?? ''),
    notes: d.notes ?? null,
    status: d.status ?? 'open',
    priority: ([1, 2, 3].includes(d.priority) ? d.priority : 2) as Priority,
    estimateMin: typeof d.estimateMin === 'number' ? d.estimateMin : null,
    dueAt: toDate(d.dueAt),
    dueHasTime: Boolean(d.dueHasTime),
    horizon: HORIZONS.includes(d.horizon) ? d.horizon : null,
    checklist: Array.isArray(d.checklist) ? d.checklist : [],
    sourceListId: d.sourceListId ?? null,
    prepId: d.prepId ?? null,
    prepStepId: d.prepStepId ?? null,
    recurrence: d.recurrence ?? null,
    seriesId: d.seriesId ?? null,
    availableAt: toDate(d.availableAt),
    order: typeof d.order === 'number' ? d.order : 0,
    createdAt: toDateOr(d.createdAt, EPOCH),
    updatedAt: toDateOr(d.updatedAt, EPOCH),
    lastTouchedAt: toDateOr(d.lastTouchedAt, toDateOr(d.createdAt, EPOCH)),
    completedAt: toDate(d.completedAt),
    abandonedAt: toDate(d.abandonedAt),
  };
}

const DATE_FIELDS = [
  'dueAt',
  'availableAt',
  'createdAt',
  'updatedAt',
  'lastTouchedAt',
  'completedAt',
  'abandonedAt',
] as const;

/** Converts Date fields of a (partial) task to Timestamps for writing. */
export function taskToDoc(t: Partial<Task>): DocumentData {
  const out: DocumentData = { ...t };
  delete out.id;
  for (const f of DATE_FIELDS) if (f in t) out[f] = ts(t[f] as Date | null);
  return out;
}

export function routineFromDoc(id: string, d: DocumentData): Routine {
  return {
    id,
    title: String(d.title ?? ''),
    weekdays: Array.isArray(d.weekdays) ? d.weekdays : [],
    active: d.active !== false,
    order: typeof d.order === 'number' ? d.order : 0,
    createdAt: toDateOr(d.createdAt, EPOCH),
  };
}

export function routineDayFromDoc(d: DocumentData): RoutineDay {
  return {
    planned: Array.isArray(d.planned) ? d.planned : [],
    done: Array.isArray(d.done) ? d.done : [],
  };
}

export function listFromDoc(id: string, d: DocumentData): ReusableList {
  return {
    id,
    name: String(d.name ?? ''),
    items: Array.isArray(d.items) ? d.items : [],
    updatedAt: toDateOr(d.updatedAt, EPOCH),
  };
}

export function templateFromDoc(id: string, d: DocumentData): PrepTemplate {
  return { id, name: String(d.name ?? ''), steps: Array.isArray(d.steps) ? d.steps : [] };
}

export function prepFromDoc(id: string, d: DocumentData): Preparation {
  return {
    id,
    name: String(d.name ?? ''),
    templateId: d.templateId ?? null,
    departAt: toDateOr(d.departAt, EPOCH),
    status: d.status === 'done' ? 'done' : 'active',
    createdAt: toDateOr(d.createdAt, EPOCH),
  };
}

export function settingsFromDoc(d: DocumentData | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(d?.settings ?? {}) };
}
