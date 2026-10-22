import { describe, expect, it } from 'vitest';
import {
  addDaysTz,
  atTimeTz,
  dayKey,
  endOfDayTz,
  endOfMonthTz,
  endOfWeekTz,
  isoWeekdayTz,
  makeDateTz,
  timeOfDay,
} from './time';
import { NOW } from './testUtils';

describe('time (Europe/Paris)', () => {
  it('computes day boundaries in Paris', () => {
    expect(endOfDayTz(NOW).toISOString()).toBe('2026-10-22T21:59:59.999Z');
    expect(dayKey(NOW)).toBe('2026-10-22');
    expect(isoWeekdayTz(NOW)).toBe(4);
  });

  it('ends the week on Sunday and the month on its last day', () => {
    expect(dayKey(endOfWeekTz(NOW))).toBe('2026-10-25');
    expect(dayKey(endOfMonthTz(NOW))).toBe('2026-10-31');
    const sunday = makeDateTz(2026, 10, 25, 9);
    expect(dayKey(endOfWeekTz(sunday))).toBe('2026-10-25');
  });

  it('keeps wall-clock times across the DST change (25 Oct 2026)', () => {
    const d = addDaysTz(atTimeTz(NOW, '18:00'), 4);
    expect(dayKey(d)).toBe('2026-10-26');
    expect(timeOfDay(d)).toBe('18:00');
    expect(endOfDayTz(d).toISOString()).toBe('2026-10-26T22:59:59.999Z');
  });
});
