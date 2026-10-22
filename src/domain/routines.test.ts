import { describe, expect, it } from 'vitest';
import { computeStreak, missingDayKeys, routinesForDay } from './routines';
import { addDaysTz, dayKey, isoWeekdayTz } from './time';
import { at, NOW } from './testUtils';
import type { Routine, RoutineDay } from './types';

const r = (id: string, weekdays: number[], active = true): Routine => ({
  id,
  title: id,
  weekdays,
  active,
  order: 0,
  createdAt: at(1, 1),
});

describe('routinesForDay', () => {
  it('only returns active routines planned on that weekday', () => {
    const routines = [r('monThu', [1, 4]), r('daily', [1, 2, 3, 4, 5, 6, 7]), r('off', [4], false)];
    expect(routinesForDay(routines, NOW).map((x) => x.id)).toEqual(['monThu', 'daily']);
    expect(routinesForDay(routines, at(10, 23)).map((x) => x.id)).toEqual(['daily']);
    expect(routinesForDay(routines, at(10, 26)).map((x) => x.id)).toEqual(['monThu', 'daily']);
  });
});

describe('computeStreak', () => {
  // 30 days of data ending today (22 Oct); "a" is planned Mon/Thu only.
  function build(missOn: string[] = [], todayDone = false): Record<string, RoutineDay> {
    const days: Record<string, RoutineDay> = {};
    for (let i = 29; i >= 0; i--) {
      const d = addDaysTz(NOW, -i);
      const key = dayKey(d);
      const planned = [1, 4].includes(isoWeekdayTz(d)) ? ['a'] : [];
      const done = i === 0 ? (todayDone ? planned : []) : missOn.includes(key) ? [] : planned;
      days[key] = { planned, done };
    }
    return days;
  }

  it('counts only planned days; days without routine are neutral', () => {
    // Mon/Thu over 30 days ending Thu 22 Oct: 9 planned days including today.
    expect(computeStreak(build([], true), NOW)).toEqual({ current: 9, best: 9 });
  });

  it('an incomplete today does not break the streak', () => {
    expect(computeStreak(build([], false), NOW)).toEqual({ current: 8, best: 8 });
  });

  it('a missed day resets the current streak but keeps the best', () => {
    // Thursday 8 Oct missed → after it: Mon 12, Thu 15, Mon 19, Thu 22 = 4.
    expect(computeStreak(build(['2026-10-08'], true), NOW)).toEqual({ current: 4, best: 4 });
    expect(computeStreak(build(['2026-10-19'], true), NOW)).toEqual({ current: 1, best: 7 });
  });

  it('lists missing days to backfill', () => {
    expect(missingDayKeys('2026-10-19', NOW)).toEqual(['2026-10-20', '2026-10-21']);
    expect(missingDayKeys('2026-10-22', NOW)).toEqual([]);
    expect(missingDayKeys(null, NOW)).toEqual([]);
  });
});
