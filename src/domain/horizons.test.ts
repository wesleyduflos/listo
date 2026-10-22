import { describe, expect, it } from 'vitest';
import { effectiveHorizon, isLate } from './horizons';
import { endOfDayTz } from './time';
import { at, makeTask, NOW } from './testUtils';

describe('effectiveHorizon', () => {
  it('derives the group from the deadline', () => {
    expect(effectiveHorizon(makeTask({ dueAt: endOfDayTz(at(10, 22)) }), NOW)).toBe('today');
    expect(effectiveHorizon(makeTask({ dueAt: at(10, 22, 18) }), NOW)).toBe('today');
    expect(effectiveHorizon(makeTask({ dueAt: endOfDayTz(at(10, 25)) }), NOW)).toBe('week');
    expect(effectiveHorizon(makeTask({ dueAt: at(10, 26) }), NOW)).toBe('month');
    expect(effectiveHorizon(makeTask({ dueAt: endOfDayTz(at(10, 31)) }), NOW)).toBe('month');
    expect(effectiveHorizon(makeTask({ dueAt: at(11, 1) }), NOW)).toBe('later');
  });

  it('marks passed deadlines as late, but never undated tasks', () => {
    const t = makeTask({ dueAt: endOfDayTz(at(10, 21)) });
    expect(isLate(t, NOW)).toBe(true);
    expect(effectiveHorizon(t, NOW)).toBe('late');
    expect(effectiveHorizon(makeTask({ dueAt: at(10, 22, 9) }), NOW)).toBe('late');
    expect(effectiveHorizon(makeTask({ horizon: 'today', createdAt: at(1, 1) }), NOW)).toBe('today');
    expect(isLate(makeTask({ dueAt: at(10, 21), status: 'done' }), NOW)).toBe(false);
  });

  it('uses the manual horizon for undated tasks', () => {
    expect(effectiveHorizon(makeTask({ horizon: 'someday' }), NOW)).toBe('someday');
    expect(effectiveHorizon(makeTask({ horizon: 'month' }), NOW)).toBe('month');
    expect(effectiveHorizon(makeTask({ horizon: null }), NOW)).toBe('week');
  });

  it('moves automatically with time', () => {
    const t = makeTask({ dueAt: endOfDayTz(at(10, 30)) });
    expect(effectiveHorizon(t, NOW)).toBe('month');
    expect(effectiveHorizon(t, at(10, 27))).toBe('week');
    expect(effectiveHorizon(t, at(10, 30, 8))).toBe('today');
    expect(effectiveHorizon(t, at(10, 31, 0, 1))).toBe('late');
  });

  it('parks a not-yet-available flexible occurrence in "later"', () => {
    const t = makeTask({ dueAt: endOfDayTz(at(10, 30)), availableAt: at(10, 27, 0) });
    expect(effectiveHorizon(t, NOW)).toBe('later');
    expect(effectiveHorizon(t, at(10, 28))).toBe('week');
  });
});
