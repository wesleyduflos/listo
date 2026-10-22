import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { newId } from '../domain/ids';
import {
  checklistFromList,
  instantiateSteps,
  stepDue,
  stepsFromTasks,
} from '../domain/preparations';
import { nextOccurrence } from '../domain/recurrence';
import { routinesForDay } from '../domain/routines';
import { calendarDiff, dayKey, timeOfDay } from '../domain/time';
import {
  DEFAULT_SETTINGS,
  type ChecklistItem,
  type ListItem,
  type Preparation,
  type PrepStep,
  type PrepTemplate,
  type ReusableList,
  type Routine,
  type RoutineDay,
  type Settings,
  type Task,
} from '../domain/types';
import { db } from '../lib/firebase';
import { taskToDoc, ts } from './converters';
import { col, sub, userDoc } from './paths';
import { SEED_LIST, SEED_TEMPLATE } from './seed';

export type TaskInput = Partial<Omit<Task, 'createdAt' | 'updatedAt' | 'lastTouchedAt'>> & {
  title: string;
};

let onError: (e: unknown) => void = (e) => console.error(e);
export function setWriteErrorHandler(fn: (e: unknown) => void) {
  onError = fn;
}

/** Rejected reads and writes share the same handler. */
export function reportDataError(e: unknown) {
  onError(e);
}

// Writes are never awaited by the UI: with the persistent cache they apply locally at once
// and their promise only settles when the server acknowledges (possibly much later).
const fire = (p: Promise<unknown>) => {
  p.catch((e) => onError(e));
};

export function createActions(uid: string) {
  const taskRef = (id: string) => sub(uid, 'tasks', id);

  function buildTask(input: TaskInput, now = new Date()): Task {
    return {
      notes: null,
      status: 'open',
      priority: 2,
      estimateMin: null,
      dueAt: null,
      dueHasTime: false,
      horizon: null,
      checklist: [],
      sourceListId: null,
      prepId: null,
      prepStepId: null,
      recurrence: null,
      seriesId: null,
      availableAt: null,
      order: now.getTime(),
      completedAt: null,
      abandonedAt: null,
      ...input,
      id: input.id ?? doc(col(uid, 'tasks')).id,
      createdAt: now,
      updatedAt: now,
      lastTouchedAt: now,
    } as Task;
  }

  function addTask(input: TaskInput): string {
    const t = buildTask(input);
    if (t.dueAt) t.horizon = null;
    fire(setDoc(taskRef(t.id), taskToDoc(t)));
    return t.id;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const now = new Date();
    const data = taskToDoc({ ...patch, updatedAt: now, lastTouchedAt: now });
    if (patch.dueAt) data.horizon = null;
    fire(updateDoc(taskRef(id), data));
  }

  /** Completes a task; returns the id of the next occurrence if one was created. */
  function completeTask(task: Task): string | null {
    const now = new Date();
    const batch = writeBatch(db);
    batch.update(taskRef(task.id), taskToDoc({ status: 'done', completedAt: now, updatedAt: now }));
    let nextId: string | null = null;
    const next = nextOccurrence(task, now);
    if (next) {
      const t = buildTask(
        {
          title: task.title,
          notes: task.notes,
          priority: task.priority,
          estimateMin: task.estimateMin,
          horizon: null,
          checklist: task.checklist.map((c) => ({ ...c, done: false })),
          sourceListId: task.sourceListId,
          recurrence: task.recurrence,
          seriesId: task.seriesId ?? task.id,
          ...next,
        },
        now,
      );
      nextId = t.id;
      batch.set(taskRef(t.id), taskToDoc(t));
    }
    fire(batch.commit());
    return nextId;
  }

  function reopenTask(task: Task, createdNextId?: string | null) {
    const batch = writeBatch(db);
    batch.update(
      taskRef(task.id),
      taskToDoc({ status: 'open', completedAt: null, abandonedAt: null, updatedAt: new Date() }),
    );
    if (createdNextId) batch.delete(taskRef(createdNextId));
    fire(batch.commit());
  }

  function abandonTask(task: Task) {
    const now = new Date();
    updateTask(task.id, { status: 'abandoned', abandonedAt: now });
  }

  function deleteTask(id: string) {
    fire(deleteDoc(taskRef(id)));
  }

  // --- Checklists -----------------------------------------------------------------------

  function setChecklist(task: Task, checklist: ChecklistItem[]) {
    updateTask(task.id, { checklist });
  }

  function toggleChecklistItem(task: Task, itemId: string) {
    setChecklist(
      task,
      task.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
    );
  }

  function addChecklistItem(task: Task, label: string, qty?: number) {
    setChecklist(task, [
      ...task.checklist,
      { id: newId(), label, ...(qty ? { qty } : {}), done: false },
    ]);
  }

  function attachList(task: Task, list: ReusableList) {
    updateTask(task.id, {
      checklist: [...task.checklist, ...checklistFromList(list.items, newId)],
      sourceListId: list.id,
    });
  }

  /** Writes the task checklist back to its source list, or to a new list. */
  function saveChecklistToList(task: Task, newListName?: string): string {
    const items: ListItem[] = task.checklist.map((c) => ({
      id: newId(),
      label: c.label,
      ...(c.qty ? { qty: c.qty } : {}),
    }));
    if (task.sourceListId && !newListName) {
      updateList(task.sourceListId, { items });
      return task.sourceListId;
    }
    const id = createList(newListName ?? task.title, items);
    updateTask(task.id, { sourceListId: id });
    return id;
  }

  // --- Reusable lists -------------------------------------------------------------------

  function createList(name: string, items: ListItem[] = []): string {
    const ref = doc(col(uid, 'lists'));
    fire(setDoc(ref, { name, items, updatedAt: ts(new Date()) }));
    return ref.id;
  }

  function updateList(id: string, patch: Partial<Omit<ReusableList, 'id'>>) {
    fire(updateDoc(sub(uid, 'lists', id), { ...patch, updatedAt: ts(new Date()) }));
  }

  function deleteList(id: string) {
    fire(deleteDoc(sub(uid, 'lists', id)));
  }

  // --- Templates & preparations ---------------------------------------------------------

  function createTemplate(name: string, steps: PrepStep[] = []): string {
    const ref = doc(col(uid, 'prepTemplates'));
    fire(setDoc(ref, { name, steps }));
    return ref.id;
  }

  function updateTemplate(id: string, patch: Partial<Omit<PrepTemplate, 'id'>>) {
    fire(updateDoc(sub(uid, 'prepTemplates', id), patch));
  }

  function deleteTemplate(id: string) {
    fire(deleteDoc(sub(uid, 'prepTemplates', id)));
  }

  function createPreparation(
    name: string,
    departAt: Date,
    template: PrepTemplate | null,
    lists: ReusableList[],
  ): string {
    const now = new Date();
    const batch = writeBatch(db);
    const prepRef = doc(col(uid, 'preparations'));
    batch.set(prepRef, {
      name,
      templateId: template?.id ?? null,
      departAt: ts(departAt),
      status: 'active',
      createdAt: ts(now),
    });
    if (template) {
      const byId = Object.fromEntries(lists.map((l) => [l.id, l.items]));
      for (const draft of instantiateSteps(template.steps, departAt, byId, newId)) {
        const t = buildTask(
          { ...draft, order: now.getTime() + draft.order, prepId: prepRef.id },
          now,
        );
        batch.set(taskRef(t.id), taskToDoc(t));
      }
    }
    fire(batch.commit());
    return prepRef.id;
  }

  /** Renames and/or moves a preparation; open steps keep their relative day and time. */
  function updatePreparation(
    prep: Preparation,
    tasks: Task[],
    patch: { name?: string; departAt?: Date },
  ) {
    const batch = writeBatch(db);
    const data: DocumentData = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.departAt) {
      data.departAt = ts(patch.departAt);
      if (patch.departAt.getTime() > Date.now()) data.status = 'active';
      for (const t of tasks) {
        if (t.status !== 'open' || !t.dueAt) continue;
        const atDeparture = t.dueAt.getTime() === prep.departAt.getTime();
        const due = stepDue(
          {
            offsetDays: calendarDiff(t.dueAt, prep.departAt),
            timeHint: t.dueHasTime && !atDeparture ? timeOfDay(t.dueAt) : null,
          },
          patch.departAt,
        );
        batch.update(taskRef(t.id), taskToDoc({ ...due, updatedAt: new Date() }));
      }
    }
    batch.update(sub(uid, 'preparations', prep.id), data);
    fire(batch.commit());
  }

  function markPreparationDone(prepId: string) {
    fire(updateDoc(sub(uid, 'preparations', prepId), { status: 'done' }));
  }

  function deletePreparation(prepId: string, tasks: Task[]) {
    const batch = writeBatch(db);
    batch.delete(sub(uid, 'preparations', prepId));
    for (const t of tasks) {
      if (t.status === 'open') batch.delete(taskRef(t.id));
      else batch.update(taskRef(t.id), { prepId: null });
    }
    fire(batch.commit());
  }

  function saveAsTemplate(prep: Preparation, tasks: Task[]): string {
    return createTemplate(prep.name, stepsFromTasks(tasks, prep.departAt, newId));
  }

  // --- Routines -------------------------------------------------------------------------

  function createRoutine(
    title: string,
    weekdays: number[],
    today: RoutineDay | undefined,
    order: number,
  ): string {
    const ref = doc(col(uid, 'routines'));
    const r: Omit<Routine, 'id'> = { title, weekdays, active: true, order, createdAt: new Date() };
    fire(setDoc(ref, { ...r, createdAt: ts(r.createdAt) }));
    syncTodayPlan({ ...r, id: ref.id }, today);
    return ref.id;
  }

  function updateRoutine(
    routine: Routine,
    patch: Partial<Omit<Routine, 'id' | 'createdAt'>>,
    today: RoutineDay | undefined,
  ) {
    fire(updateDoc(sub(uid, 'routines', routine.id), patch));
    syncTodayPlan({ ...routine, ...patch }, today);
  }

  function deleteRoutine(routine: Routine, today: RoutineDay | undefined) {
    fire(deleteDoc(sub(uid, 'routines', routine.id)));
    syncTodayPlan({ ...routine, active: false }, today);
  }

  /**
   * Today's plan is frozen at first opening, but an explicit edit of a routine today
   * is reflected immediately (added if now planned, removed if no longer planned and not done).
   */
  function syncTodayPlan(routine: Routine, today: RoutineDay | undefined) {
    if (!today) return;
    const ref = sub(uid, 'routineDays', dayKey(new Date()));
    const planned = routinesForDay([routine], new Date()).length > 0;
    const isIn = today.planned.includes(routine.id);
    if (planned && !isIn) fire(updateDoc(ref, { planned: arrayUnion(routine.id) }));
    if (!planned && isIn && !today.done.includes(routine.id))
      fire(updateDoc(ref, { planned: arrayRemove(routine.id) }));
  }

  function toggleRoutine(routineId: string, key: string, done: boolean) {
    fire(
      updateDoc(sub(uid, 'routineDays', key), {
        done: done ? arrayUnion(routineId) : arrayRemove(routineId),
      }),
    );
  }

  function writeRoutineDays(days: Record<string, RoutineDay>) {
    const batch = writeBatch(db);
    for (const [key, d] of Object.entries(days)) batch.set(sub(uid, 'routineDays', key), d);
    fire(batch.commit());
  }

  // --- Settings, seed, tokens, export ---------------------------------------------------

  function updateSettings(patch: Partial<Settings>) {
    fire(setDoc(userDoc(uid), { settings: patch }, { merge: true }));
  }

  function seed() {
    const batch = writeBatch(db);
    batch.set(userDoc(uid), { settings: { ...DEFAULT_SETTINGS, seeded: true } }, { merge: true });
    const listRef = doc(col(uid, 'lists'));
    batch.set(listRef, {
      name: SEED_LIST.name,
      items: SEED_LIST.items.map((i) => ({ id: newId(), ...i })),
      updatedAt: ts(new Date()),
    });
    batch.set(doc(col(uid, 'prepTemplates')), {
      name: SEED_TEMPLATE.name,
      steps: SEED_TEMPLATE.steps.map((s, i) => ({
        id: newId(),
        ...s,
        listId: i === SEED_TEMPLATE.listStepIndex ? listRef.id : null,
      })),
    });
    fire(batch.commit());
  }

  async function exportAll(): Promise<Record<string, unknown>> {
    const names = [
      'tasks',
      'routines',
      'routineDays',
      'lists',
      'prepTemplates',
      'preparations',
    ] as const;
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: 1 };
    for (const n of names) {
      const snap = await getDocs(col(uid, n));
      out[n] = snap.docs.map((d) => ({
        id: d.id,
        ...(serialize(d.data()) as Record<string, unknown>),
      }));
    }
    return out;
  }

  return {
    addTask,
    updateTask,
    completeTask,
    reopenTask,
    abandonTask,
    deleteTask,
    setChecklist,
    toggleChecklistItem,
    addChecklistItem,
    attachList,
    saveChecklistToList,
    createList,
    updateList,
    deleteList,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createPreparation,
    updatePreparation,
    markPreparationDone,
    deletePreparation,
    saveAsTemplate,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutine,
    writeRoutineDays,
    updateSettings,
    seed,
    exportAll,
  };
}

export type Actions = ReturnType<typeof createActions>;

function serialize(v: unknown): unknown {
  if (
    v &&
    typeof v === 'object' &&
    'toDate' in v &&
    typeof (v as { toDate: unknown }).toDate === 'function'
  ) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serialize(x)]));
  return v;
}
