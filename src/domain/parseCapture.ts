import * as chronoFr from 'chrono-node/fr';
import {
  addDaysTz,
  addMonthsTz,
  atTimeTz,
  endOfDayTz,
  endOfMonthTz,
  endOfWeekTz,
  isoWeekdayTz,
  makeDateTz,
  partsTz,
  startOfDayTz,
} from './time';
import type { Horizon, Priority } from './types';

export type TokenKind = 'date' | 'priority' | 'duration' | 'horizon';

export interface CaptureToken {
  kind: TokenKind;
  raw: string;
  start: number;
  end: number;
}

export interface ParsedCapture {
  title: string;
  dueAt: Date | null;
  dueHasTime: boolean;
  horizon: Horizon | null;
  priority: Priority | null;
  estimateMin: number | null;
  tokens: CaptureToken[];
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS: [RegExp, number][] = [
  [/^janv/, 1],
  [/^fev/, 2],
  [/^mars/, 3],
  [/^avr/, 4],
  [/^mai/, 5],
  [/^juin/, 6],
  [/^juil/, 7],
  [/^aout/, 8],
  [/^sep/, 9],
  [/^oct/, 10],
  [/^nov/, 11],
  [/^dec/, 12],
];
const MONTH_RE =
  'janv(?:ier)?|fevr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|aout|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?';
const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
};
const B = '(?<![a-z0-9])';
const E = '(?![a-z0-9])';
/** Optional time after a date: "18h", "à 18h30", "vers 9 h", "18:30". */
const TIME_SUFFIX = `(?:\\s+(?:a\\s+|vers\\s+)?(\\d{1,2})(?:\\s?h\\s?(\\d{2})?|:(\\d{2}))${E})?`;
const TRAILING_CONNECTORS = new Set(['a', 'à', 'pour', 'avant', "d'ici", 'vers', 'le', 'de', 'la']);

/** Lowercase, accents and typographic apostrophes removed, same length as the input. */
function normalize(s: string): string {
  return Array.from(s)
    .map((c) => {
      const base = c.normalize('NFD').replace(/\p{M}/gu, '');
      const out = (base.length === 1 ? base : c).toLowerCase();
      return out === '’' ? "'" : out.length === 1 ? out : c;
    })
    .join('');
}

interface Match {
  start: number;
  end: number;
  groups: (string | undefined)[];
}

class Scanner {
  readonly norm: string;
  private taken: boolean[];
  readonly tokens: CaptureToken[] = [];

  constructor(readonly input: string) {
    this.norm = normalize(input);
    this.taken = new Array(input.length).fill(false);
  }

  private free(start: number, end: number) {
    for (let i = start; i < end; i++) if (this.taken[i]) return false;
    return true;
  }

  find(pattern: string): Match[] {
    const re = new RegExp(pattern, 'g');
    const out: Match[] = [];
    for (const m of this.norm.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (m[0].length && this.free(start, end)) out.push({ start, end, groups: m.slice(1) });
    }
    return out;
  }

  take(kind: TokenKind, start: number, end: number) {
    for (let i = start; i < end; i++) this.taken[i] = true;
    this.tokens.push({ kind, raw: this.input.slice(start, end), start, end });
  }

  rest(): string {
    return Array.from(this.input, (c, i) => (this.taken[i] ? ' ' : c)).join('');
  }
}

function withTime(day: Date, h?: string, m1?: string, m2?: string): { at: Date; hasTime: boolean } {
  if (h === undefined) return { at: endOfDayTz(day), hasTime: false };
  const hh = Math.min(23, Number(h));
  const mm = Math.min(59, Number(m1 ?? m2 ?? 0));
  return {
    at: atTimeTz(day, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`),
    hasTime: true,
  };
}

function monthNumber(s: string): number {
  return MONTHS.find(([re]) => re.test(s))?.[1] ?? 0;
}

/** Next occurrence (today included) of a given day/month. */
function nextDayMonth(day: number, month: number, now: Date, year?: number): Date | null {
  const today = partsTz(now);
  let y = year ?? today.year;
  let d = makeDateTz(y, month, day);
  if (partsTz(d).day !== day) return null;
  if (!year && startOfDayTz(d).getTime() < startOfDayTz(now).getTime()) {
    y += 1;
    d = makeDateTz(y, month, day);
  }
  return d;
}

export function parseCapture(input: string, now: Date): ParsedCapture {
  const s = new Scanner(input);
  let priority: Priority | null = null;
  let estimateMin: number | null = null;
  let horizon: Horizon | null = null;
  let dueAt: Date | null = null;
  let dueHasTime = false;
  let horizonDue: Date | null = null;

  // Priority: first occurrence wins, every occurrence is removed from the title.
  const prios = [
    ...s.find(`${B}p([123])${E}`).map((m) => ({ ...m, value: Number(m.groups[0]) as Priority })),
    ...s
      .find('(?<![!])(!{2,3})(?![!])')
      .map((m) => ({ ...m, value: (m.groups[0]!.length === 3 ? 1 : 2) as Priority })),
  ].sort((a, b) => a.start - b.start);
  for (const m of prios) {
    priority ??= m.value;
    s.take('priority', m.start, m.end);
  }

  // Explicit horizons.
  const horizonRules: [string, (m: Match) => void][] = [
    [`${B}un de ces jours${E}`, () => (horizon ??= 'someday')],
    [`${B}un jour${E}`, () => (horizon ??= 'someday')],
    [`${B}cette semaine${E}`, () => (horizon ??= 'week')],
    [
      `${B}(?:la )?semaine pro(?:chaine)?${E}`,
      () => (horizonDue ??= endOfWeekTz(addDaysTz(now, 7))),
    ],
    [`${B}ce mois(?:[- ]ci)?${E}`, () => (horizon ??= 'month')],
    [
      `${B}(?:le )?mois pro(?:chain)?${E}`,
      () => (horizonDue ??= endOfMonthTz(addMonthsTz(startOfDayTz(now), 1))),
    ],
  ];
  for (const [re, apply] of horizonRules) {
    for (const m of s.find(re)) {
      apply(m);
      s.take('horizon', m.start, m.end);
    }
  }

  // Dates (house rules first, each may carry a time).
  const setDate = (day: Date, m: Match, timeIdx: number) => {
    const { at, hasTime } = withTime(
      day,
      m.groups[timeIdx],
      m.groups[timeIdx + 1],
      m.groups[timeIdx + 2],
    );
    if (!dueAt) {
      dueAt = at;
      dueHasTime = hasTime;
    }
    s.take('date', m.start, m.end);
  };
  for (const m of s.find(`${B}apres[- ]demain${E}${TIME_SUFFIX}`)) setDate(addDaysTz(now, 2), m, 0);
  for (const m of s.find(`${B}demain${E}${TIME_SUFFIX}`)) setDate(addDaysTz(now, 1), m, 0);
  for (const m of s.find(`${B}(?:aujourd'?\\s?hui|ce soir)${E}${TIME_SUFFIX}`)) setDate(now, m, 0);
  for (const m of s.find(
    `${B}(?:(?:ce|le)\\s+)?(${WEEKDAYS.join('|')})(?:\\s+prochaine?)?${E}${TIME_SUFFIX}`,
  )) {
    const target = WEEKDAYS.indexOf(m.groups[0]!) + 1;
    const delta = (target - isoWeekdayTz(now) + 7) % 7 || 7;
    setDate(addDaysTz(now, delta), m, 1);
  }
  for (const m of s.find(
    `${B}(?:le\\s+)?(\\d{1,2})(?:er)?\\s+(${MONTH_RE})\\.?(?:\\s+(\\d{4}))?${E}${TIME_SUFFIX}`,
  )) {
    const d = nextDayMonth(
      Number(m.groups[0]),
      monthNumber(m.groups[1]!),
      now,
      m.groups[2] ? Number(m.groups[2]) : undefined,
    );
    if (d) setDate(d, m, 3);
  }
  for (const m of s.find(`${B}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${E}${TIME_SUFFIX}`)) {
    const y = m.groups[2]
      ? Number(m.groups[2].length === 2 ? `20${m.groups[2]}` : m.groups[2])
      : undefined;
    const d = nextDayMonth(Number(m.groups[0]), Number(m.groups[1]), now, y);
    if (d) setDate(d, m, 3);
  }
  for (const m of s.find(`${B}le\\s+(\\d{1,2})(?:er)?${E}${TIME_SUFFIX}`)) {
    const day = Number(m.groups[0]);
    const { year, month } = partsTz(now);
    let d = nextDayMonth(day, month, now, year);
    if (!d || startOfDayTz(d).getTime() < startOfDayTz(now).getTime()) {
      const next = partsTz(addMonthsTz(makeDateTz(year, month, 1), 1));
      d = nextDayMonth(day, next.month, now, next.year);
    }
    if (d) setDate(d, m, 1);
  }
  for (const m of s.find(
    `${B}dans\\s+(\\d+|un|une|deux|trois|quatre|cinq|six)\\s+(jours?|j|semaines?|sem|mois)${E}${TIME_SUFFIX}`,
  )) {
    const n = NUMBER_WORDS[m.groups[0]!] ?? Number(m.groups[0]);
    const unit = m.groups[1]!;
    const d = unit.startsWith('mois')
      ? addMonthsTz(now, n)
      : addDaysTz(now, unit.startsWith('s') ? n * 7 : n);
    setDate(d, m, 2);
  }
  // A lone time: "à 18h", "vers 9h30" → today if still ahead, otherwise tomorrow.
  const loneTime = (m: Match, offset: number) => {
    const today = withTime(now, m.groups[offset], m.groups[offset + 1], m.groups[offset + 2]);
    const at = today.at.getTime() > now.getTime() ? today.at : addDaysTz(today.at, 1);
    if (!dueAt) {
      dueAt = at;
      dueHasTime = true;
    }
    s.take('date', m.start, m.end);
  };
  for (const m of s.find(`${B}(?:a|vers)\\s+(\\d{1,2})(?:\\s?h\\s?(\\d{2})?|:(\\d{2}))${E}`)) {
    loneTime(m, 0);
  }

  // Durations: "15min", "15 min", "90mn", "1h", "1h30", "1 h 30".
  for (const m of s.find(`${B}(\\d{1,4})\\s?(?:min(?:utes?)?|mn)${E}`)) {
    estimateMin ??= Number(m.groups[0]);
    s.take('duration', m.start, m.end);
  }
  for (const m of s.find(`${B}(\\d{1,2})\\s?h(?:\\s?(\\d{1,2})(?:\\s?(?:min|mn))?)?${E}`)) {
    const h = Number(m.groups[0]);
    if (h >= 6 && !m.groups[1]) {
      // "18h" alone reads as a time of day rather than an 18-hour task.
      loneTime({ ...m, groups: [m.groups[0], undefined, undefined] }, 0);
      continue;
    }
    estimateMin ??= h * 60 + Number(m.groups[1] ?? 0);
    s.take('duration', m.start, m.end);
  }

  // Fallback: chrono-node (fr) for numeric expressions the house rules do not cover.
  if (!dueAt) {
    const rest = s.rest();
    for (const r of chronoFr.parse(rest, now, { forwardDate: true })) {
      if (!/\d/.test(r.text)) continue;
      const start = r.index;
      const end = start + r.text.length;
      if (rest.slice(start, end).trim() !== input.slice(start, end).trim()) continue;
      const hasTime = r.start.isCertain('hour');
      const day = r.start.date();
      dueAt = hasTime ? day : endOfDayTz(day);
      dueHasTime = hasTime;
      s.take('date', start, end);
      break;
    }
  }

  if (!dueAt && horizonDue) {
    dueAt = horizonDue;
    dueHasTime = false;
  }
  if (dueAt) horizon = null;

  return {
    title: cleanTitle(s.rest()),
    dueAt,
    dueHasTime,
    horizon,
    priority,
    estimateMin,
    tokens: s.tokens.sort((a, b) => a.start - b.start),
  };
}

function cleanTitle(rest: string): string {
  const words = rest.split(/\s+/).filter(Boolean);
  while (words.length > 1 && TRAILING_CONNECTORS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  const title = words
    .join(' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/^[,.;:\s]+|[,;:\s]+$/g, '');
  return title.charAt(0).toUpperCase() + title.slice(1);
}
