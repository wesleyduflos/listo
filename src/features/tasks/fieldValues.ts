import { atTimeTz, endOfDayTz, formatTz, makeDateTz } from '../../domain/time';
import type { Horizon, Priority } from '../../domain/types';

export const dateValue = (d: Date | null) => (d ? formatTz(d, 'yyyy-MM-dd') : '');
export const timeValue = (d: Date | null, hasTime: boolean) =>
  d && hasTime ? formatTz(d, 'HH:mm') : '';

export function fromInputs(
  date: string,
  time: string,
): { dueAt: Date | null; dueHasTime: boolean } {
  if (!date) return { dueAt: null, dueHasTime: false };
  const [y, m, d] = date.split('-').map(Number);
  const day = makeDateTz(y, m, d);
  return time
    ? { dueAt: atTimeTz(day, time), dueHasTime: true }
    : { dueAt: endOfDayTz(day), dueHasTime: false };
}

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: 'P1' },
  { value: 2, label: 'P2' },
  { value: 3, label: 'P3' },
];

export const HORIZON_OPTIONS: { value: Horizon; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois-ci' },
  { value: 'someday', label: 'Un jour' },
];

export const HORIZON_LABEL: Record<Horizon, string> = {
  today: "Aujourd'hui",
  week: 'Semaine',
  month: 'Mois',
  someday: 'Un jour',
};
