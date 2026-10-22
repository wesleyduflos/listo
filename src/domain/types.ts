export type Horizon = 'today' | 'week' | 'month' | 'someday';
/** Display bucket: horizons plus the derived "late" status and the "later" overflow group. */
export type Group = 'late' | 'today' | 'week' | 'month' | 'later' | 'someday';
export type Priority = 1 | 2 | 3;
export type TaskStatus = 'open' | 'done' | 'abandoned';

export type Recurrence =
  | null
  | { mode: 'fixed'; every: number; unit: 'day' | 'week' | 'month' }
  | { mode: 'flex'; minDays: number; maxDays: number };

export interface ChecklistItem {
  id: string;
  label: string;
  qty?: number;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  estimateMin: number | null;
  dueAt: Date | null;
  /** false when the deadline is a whole day (stored at 23:59:59.999 Paris time). */
  dueHasTime: boolean;
  /** Only meaningful when dueAt is null. */
  horizon: Horizon | null;
  checklist: ChecklistItem[];
  sourceListId: string | null;
  prepId: string | null;
  prepStepId: string | null;
  recurrence: Recurrence;
  seriesId: string | null;
  /** Flexible recurrence: the task stays out of the near horizons until this date. */
  availableAt: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lastTouchedAt: Date;
  completedAt: Date | null;
  abandonedAt: Date | null;
}

export interface Routine {
  id: string;
  title: string;
  /** 1 = Monday … 7 = Sunday */
  weekdays: number[];
  active: boolean;
  order: number;
  createdAt: Date;
}

export interface RoutineDay {
  planned: string[];
  done: string[];
}

export interface ListItem {
  id: string;
  label: string;
  qty?: number;
}

export interface ReusableList {
  id: string;
  name: string;
  items: ListItem[];
  updatedAt: Date;
}

export interface PrepStep {
  id: string;
  title: string;
  offsetDays: number;
  timeHint: string | null;
  priority: Priority;
  estimateMin: number | null;
  listId: string | null;
}

export interface PrepTemplate {
  id: string;
  name: string;
  steps: PrepStep[];
}

export interface Preparation {
  id: string;
  name: string;
  templateId: string | null;
  departAt: Date;
  status: 'active' | 'done';
  createdAt: Date;
}

export interface Settings {
  timezone: string;
  somedayNudgeDays: number;
  defaultPriority: Priority;
  seeded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  timezone: 'Europe/Paris',
  somedayNudgeDays: 30,
  defaultPriority: 2,
  seeded: false,
};
