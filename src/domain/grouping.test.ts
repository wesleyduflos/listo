import { describe, expect, it } from 'vitest';
import { groupTasks, todayView } from './grouping';
import { at, makeTask, NOW } from './testUtils';
import { endOfDayTz } from './time';

describe('todayView', () => {
  it('splits late, today, preparation steps and completed tasks', () => {
    const tasks = [
      makeTask({ title: 'late', dueAt: endOfDayTz(at(10, 21)) }),
      makeTask({ title: 'today', horizon: 'today' }),
      makeTask({ title: 'prep', dueAt: endOfDayTz(NOW), prepId: 'p' }),
      makeTask({ title: 'week', dueAt: at(10, 24) }),
      makeTask({ title: 'done', status: 'done', completedAt: at(10, 22, 8) }),
      makeTask({ title: 'done yesterday', status: 'done', completedAt: at(10, 21, 8) }),
      makeTask({ title: 'abandoned', status: 'abandoned', horizon: 'today' }),
    ];
    const v = todayView(tasks, NOW);
    expect(v.late.map((t) => t.title)).toEqual(['late']);
    expect(v.today.map((t) => t.title)).toEqual(['today']);
    expect(v.prepToday.map((t) => t.title)).toEqual(['prep']);
    expect(v.done.map((t) => t.title)).toEqual(['done']);
    expect(v.total).toBe(4);
    expect(v.doneCount).toBe(1);
  });

  it('groups every open task once', () => {
    const g = groupTasks(
      [
        makeTask({ horizon: 'someday' }),
        makeTask({ dueAt: at(12, 1) }),
        makeTask({ dueAt: at(10, 28) }),
      ],
      NOW,
    );
    expect(g.someday).toHaveLength(1);
    expect(g.later).toHaveLength(1);
    expect(g.month).toHaveLength(1);
  });
});
