import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  getISODay,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const TZ = 'Europe/Paris';

// Every helper converts to a "wall clock" Date (local fields = Paris time), works on it
// with date-fns, and converts back, so results do not depend on the device timezone.
const wall = (d: Date) => toZonedTime(d, TZ);
const unwall = (d: Date) => fromZonedTime(d, TZ);

export function startOfDayTz(d: Date): Date {
  return unwall(startOfDay(wall(d)));
}

export function endOfDayTz(d: Date): Date {
  return unwall(endOfDay(wall(d)));
}

export function addDaysTz(d: Date, n: number): Date {
  return unwall(addDays(wall(d), n));
}

export function addMonthsTz(d: Date, n: number): Date {
  return unwall(addMonths(wall(d), n));
}

/** End of the current week (weeks start on Monday). */
export function endOfWeekTz(d: Date): Date {
  const w = wall(d);
  return unwall(endOfDay(addDays(w, 7 - getISODay(w))));
}

export function endOfMonthTz(d: Date): Date {
  return unwall(endOfMonth(wall(d)));
}

/** 1 = Monday … 7 = Sunday */
export function isoWeekdayTz(d: Date): number {
  return getISODay(wall(d));
}

export function dayKey(d: Date): string {
  return format(wall(d), 'yyyy-MM-dd');
}

export function fromDayKey(key: string): Date {
  return unwall(new Date(`${key}T12:00:00`));
}

export function calendarDiff(later: Date, earlier: Date): number {
  return differenceInCalendarDays(wall(later), wall(earlier));
}

export function isSameDayTz(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** Same calendar day as `day`, at HH:mm Paris time. */
export function atTimeTz(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const w = startOfDay(wall(day));
  w.setHours(h, m, 0, 0);
  return unwall(w);
}

export function timeOfDay(d: Date): string {
  return format(wall(d), 'HH:mm');
}

export function minutesOfDay(d: Date): number {
  const w = wall(d);
  return w.getHours() * 60 + w.getMinutes();
}

/** Builds a Paris instant from calendar parts (month is 1-based). */
export function makeDateTz(year: number, month: number, day: number, hh = 12, mm = 0): Date {
  return unwall(new Date(year, month - 1, day, hh, mm, 0, 0));
}

export function partsTz(d: Date): { year: number; month: number; day: number } {
  const w = wall(d);
  return { year: w.getFullYear(), month: w.getMonth() + 1, day: w.getDate() };
}

export function formatTz(d: Date, pattern: string): string {
  return format(wall(d), pattern, { locale: fr });
}
