import { describe, expect, it } from 'vitest';
import { sortTasks } from './sorting';
import { at, makeTask, NOW } from './testUtils';

describe('sortTasks', () => {
  it('orders late, then priority, then deadline, then manual order', () => {
    const late = makeTask({ title: 'late', priority: 3, dueAt: at(10, 21) });
    const p1 = makeTask({ title: 'p1', priority: 1 });
    const p2early = makeTask({ title: 'p2early', priority: 2, dueAt: at(10, 23) });
    const p2late = makeTask({ title: 'p2late', priority: 2, dueAt: at(10, 24) });
    const p2undatedA = makeTask({ title: 'p2a', priority: 2, order: 1 });
    const p2undatedB = makeTask({ title: 'p2b', priority: 2, order: 2 });
    const sorted = sortTasks([p2undatedB, p2late, p1, p2undatedA, late, p2early], NOW);
    expect(sorted.map((t) => t.title)).toEqual(['late', 'p1', 'p2early', 'p2late', 'p2a', 'p2b']);
  });
});
