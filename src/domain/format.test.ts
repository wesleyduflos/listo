import { describe, expect, it } from 'vitest';
import { formatCountdown, formatDuration, lateLabel, recurrenceLabel, shortDay } from './format';
import { at, NOW } from './testUtils';
import { endOfDayTz } from './time';

describe('format', () => {
  it('formats durations and countdowns', () => {
    expect(formatDuration(25)).toBe('25 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(70)).toBe('1 h 10');
    expect(formatDuration(65)).toBe('1 h 05');
    expect(formatCountdown(((24 + 7) * 60 + 3) * 60000)).toBe('1 j 7 h');
    expect(formatCountdown(320 * 60000)).toBe('5 h 20 min');
  });

  it('formats dates in French', () => {
    expect(shortDay(at(10, 24))).toBe('sam. 24');
    expect(lateLabel(endOfDayTz(at(10, 21)), NOW)).toBe('échéance hier');
  });

  it('describes recurrences', () => {
    expect(recurrenceLabel({ mode: 'flex', minDays: 35, maxDays: 42 })).toBe(
      'Récurrent ~ 5–6 sem.',
    );
    expect(recurrenceLabel({ mode: 'fixed', every: 2, unit: 'week' })).toBe('Tous les 2 semaines');
    expect(recurrenceLabel({ mode: 'fixed', every: 1, unit: 'month' })).toBe('Chaque mois');
  });
});
