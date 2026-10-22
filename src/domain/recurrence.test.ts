import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';
import { at, NOW } from './testUtils';
import { dayKey, endOfDayTz, timeOfDay } from './time';

describe('nextOccurrence', () => {
  it('fixed: steps from the previous deadline', () => {
    const n = nextOccurrence(
      {
        recurrence: { mode: 'fixed', every: 1, unit: 'week' },
        dueAt: endOfDayTz(at(10, 22)),
        dueHasTime: false,
      },
      NOW,
    )!;
    expect(dayKey(n.dueAt)).toBe('2026-10-29');
    expect(n.dueAt).toEqual(endOfDayTz(at(10, 29)));
    expect(n.availableAt).toBeNull();
  });

  it('fixed: keeps the time of day and skips occurrences already passed', () => {
    const n = nextOccurrence(
      {
        recurrence: { mode: 'fixed', every: 3, unit: 'day' },
        dueAt: at(10, 10, 9, 30),
        dueHasTime: true,
      },
      NOW,
    )!;
    expect(dayKey(n.dueAt)).toBe('2026-10-25');
    expect(timeOfDay(n.dueAt)).toBe('09:30');
  });

  it('fixed monthly from completion when undated', () => {
    const n = nextOccurrence(
      { recurrence: { mode: 'fixed', every: 1, unit: 'month' }, dueAt: null, dueHasTime: false },
      NOW,
    )!;
    expect(dayKey(n.dueAt)).toBe('2026-11-22');
  });

  it('flex: deadline = completion + max, shown from completion + min', () => {
    const n = nextOccurrence(
      {
        recurrence: { mode: 'flex', minDays: 35, maxDays: 42 },
        dueAt: at(10, 30),
        dueHasTime: false,
      },
      NOW,
    )!;
    expect(dayKey(n.dueAt)).toBe('2026-12-03');
    expect(dayKey(n.availableAt!)).toBe('2026-11-26');
  });

  it('returns null without recurrence', () => {
    expect(nextOccurrence({ recurrence: null, dueAt: null, dueHasTime: false }, NOW)).toBeNull();
  });
});
