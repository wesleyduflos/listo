import { describe, expect, it } from 'vitest';
import { buildEveningMessage, buildMorningMessage, isSlotDue } from './notifications';
import { somedayNudge } from './nudge';
import { at, makeTask, NOW } from './testUtils';
import { endOfDayTz } from './time';

describe('notifications', () => {
  it('morning: count, time and P1/late list', () => {
    const tasks = [
      makeTask({ title: 'Mutuelle', priority: 1, dueAt: endOfDayTz(at(10, 21)), estimateMin: 10 }),
      makeTask({ title: 'Banque', priority: 1, horizon: 'today', estimateMin: 60 }),
      makeTask({ title: 'Plantes', priority: 3, horizon: 'today' }),
      ...Array.from({ length: 6 }, (_, i) => makeTask({ title: `P1-${i}`, priority: 1, horizon: 'today' })),
    ];
    const m = buildMorningMessage(tasks, NOW)!;
    expect(m.title).toBe("Aujourd'hui · 9 tâches · 1 h 10");
    const lines = m.body.split('\n');
    expect(lines[0]).toBe('Mutuelle (en retard)');
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe('+ 3 autres');
    expect(m.link).toBe('/');
  });

  it('evening: summary or congratulations', () => {
    const open = makeTask({ horizon: 'today' });
    const done = makeTask({ status: 'done', completedAt: at(10, 22, 9) });
    expect(buildEveningMessage([open, done], NOW, true)).toEqual({
      title: 'Bilan · 1/2 bouclées',
      body: '1 tâche à décider',
      link: '/bilan',
    });
    expect(buildEveningMessage([done], NOW, true)!.title).toBe('Journée bouclée');
    expect(buildEveningMessage([done], NOW, false)).toBeNull();
    expect(buildEveningMessage([], NOW, true)).toBeNull();
  });

  it('sends a slot once per day within its window', () => {
    expect(isSlotDue('08:00', at(10, 22, 8, 5), null, '2026-10-22')).toBe(true);
    expect(isSlotDue('08:00', at(10, 22, 8, 5), '2026-10-22', '2026-10-22')).toBe(false);
    expect(isSlotDue('08:00', at(10, 22, 7, 55), null, '2026-10-22')).toBe(false);
    expect(isSlotDue('08:00', at(10, 22, 16, 0), null, '2026-10-22')).toBe(false);
  });
});

describe('somedayNudge', () => {
  it('suggests the oldest untouched someday task past the threshold', () => {
    const a = makeTask({ title: 'console', horizon: 'someday', lastTouchedAt: at(9, 18) });
    const b = makeTask({ title: 'cave', horizon: 'someday', lastTouchedAt: at(10, 10) });
    const n = somedayNudge([b, a], NOW, 30)!;
    expect(n.task.title).toBe('console');
    expect(n.days).toBe(34);
    expect(somedayNudge([b], NOW, 30)).toBeNull();
  });
});
