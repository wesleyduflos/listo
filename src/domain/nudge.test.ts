import { describe, expect, it } from 'vitest';
import { somedayNudge } from './nudge';
import { at, makeTask, NOW } from './testUtils';

describe('somedayNudge', () => {
  it('suggests the oldest untouched someday task past the threshold', () => {
    const a = makeTask({ title: 'console', horizon: 'someday', lastTouchedAt: at(9, 18) });
    const b = makeTask({ title: 'cave', horizon: 'someday', lastTouchedAt: at(10, 10) });
    const n = somedayNudge([b, a], NOW, 30)!;
    expect(n.task.title).toBe('console');
    expect(n.days).toBe(34);
    expect(somedayNudge([b], NOW, 30)).toBeNull();
  });

  it('ignores dated and non-someday tasks', () => {
    const old = at(1, 1);
    expect(somedayNudge([makeTask({ horizon: 'week', lastTouchedAt: old })], NOW, 30)).toBeNull();
    expect(
      somedayNudge(
        [makeTask({ horizon: 'someday', dueAt: at(12, 1), lastTouchedAt: old })],
        NOW,
        30,
      ),
    ).toBeNull();
  });
});
