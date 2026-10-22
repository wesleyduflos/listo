import { describe, expect, it } from 'vitest';
import {
  instantiateSteps,
  prepProgress,
  prepTimeline,
  relativeDayLabel,
  stepDue,
  stepsFromTasks,
} from './preparations';
import { at, makeTask } from './testUtils';
import { dayKey, timeOfDay } from './time';
import type { PrepStep } from './types';

const DEPART = at(10, 23, 18, 0); // Friday 18:00
let n = 0;
const id = () => `id${++n}`;

const steps: PrepStep[] = [
  { id: 's1', title: "Réserver l'hôtel", offsetDays: -2, timeHint: null, priority: 2, estimateMin: 10, listId: null },
  { id: 's2', title: 'Faire la valise', offsetDays: -1, timeHint: '20:00', priority: 1, estimateMin: 25, listId: 'valise' },
  { id: 's3', title: 'Fermer les volets', offsetDays: 0, timeHint: null, priority: 2, estimateMin: 5, listId: null },
  { id: 's4', title: 'Arroser', offsetDays: 0, timeHint: '20:00', priority: 3, estimateMin: 5, listId: null },
  { id: 's5', title: 'Courses', offsetDays: 0, timeHint: '10:00', priority: 2, estimateMin: 30, listId: null },
];

describe('preparation instantiation', () => {
  it('computes deadlines backwards from the departure', () => {
    const drafts = instantiateSteps(steps, DEPART, { valise: [{ id: 'a', label: 'T-shirts', qty: 3 }] }, id);
    expect(dayKey(drafts[0].dueAt!)).toBe('2026-10-21');
    expect(drafts[0].dueHasTime).toBe(false);
    expect(timeOfDay(drafts[0].dueAt!)).toBe('23:59');
    expect(dayKey(drafts[1].dueAt!)).toBe('2026-10-22');
    expect(timeOfDay(drafts[1].dueAt!)).toBe('20:00');
    // Departure day without a time: due at departure time at the latest.
    expect(drafts[2].dueAt).toEqual(DEPART);
    expect(drafts[2].dueHasTime).toBe(true);
    // A time hint after the departure is capped.
    expect(drafts[3].dueAt).toEqual(DEPART);
    expect(timeOfDay(drafts[4].dueAt!)).toBe('10:00');
  });

  it('copies the attached list as an unchecked checklist', () => {
    const [, valise] = instantiateSteps(steps, DEPART, { valise: [{ id: 'a', label: 'T-shirts', qty: 3 }] }, id);
    expect(valise.checklist).toEqual([{ id: expect.any(String), label: 'T-shirts', qty: 3, done: false }]);
    expect(valise.sourceListId).toBe('valise');
  });

  it('ignores a missing list', () => {
    const [, valise] = instantiateSteps(steps, DEPART, {}, id);
    expect(valise.checklist).toEqual([]);
    expect(valise.sourceListId).toBeNull();
  });

  it('round-trips through "save as template"', () => {
    const drafts = instantiateSteps(steps, DEPART, {}, id);
    const tasks = drafts.map((d) => makeTask({ ...d }));
    const back = stepsFromTasks(tasks, DEPART, id);
    expect(back.map((s) => [s.title, s.offsetDays, s.timeHint])).toEqual([
      ["Réserver l'hôtel", -2, null],
      ['Faire la valise', -1, '20:00'],
      ['Courses', 0, '10:00'],
      ['Fermer les volets', 0, null],
      ['Arroser', 0, null],
    ]);
  });

  it('builds a timeline and progress', () => {
    const drafts = instantiateSteps(steps, DEPART, {}, id);
    const tasks = drafts.map((d, i) => makeTask({ ...d, status: i === 0 ? 'done' : 'open' }));
    const tl = prepTimeline(tasks, DEPART);
    expect(tl.map((d) => d.offset)).toEqual([-2, -1, 0]);
    expect(tl[2].tasks.map((t) => t.title)).toEqual(['Courses', 'Fermer les volets', 'Arroser']);
    expect(prepProgress(tasks)).toEqual({ done: 1, total: 5, remainingMin: 65 });
    expect(relativeDayLabel(-1)).toBe('J-1');
    expect(relativeDayLabel(0)).toBe('Jour J');
  });

  it('stepDue at end of day for earlier days', () => {
    expect(stepDue({ offsetDays: -3, timeHint: null }, DEPART).dueHasTime).toBe(false);
  });
});
