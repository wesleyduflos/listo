import { describe, expect, it } from 'vitest';
import { parseCapture } from './parseCapture';
import { NOW } from './testUtils';
import { dayKey, timeOfDay } from './time';

const p = (s: string) => parseCapture(s, NOW);
const day = (d: Date | null) => (d ? dayKey(d) : null);

describe('parseCapture — reference table (§6)', () => {
  const cases: [string, string, string | null, number | null, number | null, string | null, string?][] = [
    ['coiffeur samedi p2 15min', 'Coiffeur', '2026-10-24', 2, 15, null],
    ['vendre la console un jour', 'Vendre la console', null, null, null, 'someday'],
    ['croquettes demain !!', 'Croquettes', '2026-10-23', 2, null, null],
    ['appeler mutuelle p1', 'Appeler mutuelle', null, 1, null, null],
    ['réviser vélo 31 oct 45min p3', 'Réviser vélo', '2026-10-31', 3, 45, null],
    ['rdv dentiste lundi prochain 9h', 'Rdv dentiste', '2026-10-26', null, null, null, '09:00'],
    ['trier la cave ce mois-ci 1h30', 'Trier la cave', null, null, 90, 'month'],
  ];
  it.each(cases)('%s', (input, title, due, prio, dur, horizon, time) => {
    const r = p(input);
    expect(r.title).toBe(title);
    expect(day(r.dueAt)).toBe(due);
    expect(r.priority).toBe(prio);
    expect(r.estimateMin).toBe(dur);
    expect(r.horizon).toBe(horizon);
    if (time) {
      expect(r.dueHasTime).toBe(true);
      expect(timeOfDay(r.dueAt!)).toBe(time);
    } else if (r.dueAt) {
      expect(r.dueHasTime).toBe(false);
      expect(timeOfDay(r.dueAt)).toBe('23:59');
    }
  });
});

describe('parseCapture — priorities', () => {
  it('recognises p1/p2/p3 and !!!/!! case-insensitively', () => {
    expect(p('Appeler P1').priority).toBe(1);
    expect(p('appeler !!!').priority).toBe(1);
    expect(p('appeler !!').priority).toBe(2);
    expect(p('appeler p3').priority).toBe(3);
  });
  it('keeps the first priority and removes duplicates', () => {
    const r = p('p1 appeler p3');
    expect(r.priority).toBe(1);
    expect(r.title).toBe('Appeler');
    expect(r.tokens.filter((t) => t.kind === 'priority')).toHaveLength(2);
  });
  it('does not take p1 inside a word', () => {
    expect(p('changer ampoule p12').priority).toBeNull();
    expect(p('changer ampoule p12').title).toBe('Changer ampoule p12');
  });
});

describe('parseCapture — durations', () => {
  it.each([
    ['15min', 15],
    ['15 min', 15],
    ['1h', 60],
    ['1h30', 90],
    ['1 h 30', 90],
    ['90mn', 90],
    ['2h15min', 135],
  ])('%s', (tok, min) => {
    expect(p(`ranger ${tok}`).estimateMin).toBe(min);
    expect(p(`ranger ${tok}`).title).toBe('Ranger');
  });
});

describe('parseCapture — dates', () => {
  it.each([
    ['demain', '2026-10-23'],
    ['après-demain', '2026-10-24'],
    ['apres demain', '2026-10-24'],
    ["aujourd'hui", '2026-10-22'],
    ['ce soir', '2026-10-22'],
    ['samedi', '2026-10-24'],
    ['jeudi', '2026-10-29'],
    ['ce vendredi', '2026-10-23'],
    ['lundi prochain', '2026-10-26'],
    ['le 3', '2026-11-03'],
    ['le 22', '2026-10-22'],
    ['3 nov', '2026-11-03'],
    ['le 1er décembre', '2026-12-01'],
    ['15 janvier', '2027-01-15'],
    ['dans 2 semaines', '2026-11-05'],
    ['dans 3 jours', '2026-10-25'],
    ['dans un mois', '2026-11-22'],
    ['15/11', '2026-11-15'],
  ])('%s', (tok, expected) => {
    const r = p(`payer facture ${tok}`);
    expect(day(r.dueAt)).toBe(expected);
    expect(r.title).toBe('Payer facture');
    expect(r.horizon).toBeNull();
  });

  it('handles times', () => {
    let r = p('appeler maman à 18h');
    expect(day(r.dueAt)).toBe('2026-10-22');
    expect(timeOfDay(r.dueAt!)).toBe('18:00');
    expect(r.title).toBe('Appeler maman');
    r = p('appeler maman à 8h');
    expect(day(r.dueAt)).toBe('2026-10-23');
    r = p('train demain à 7h45');
    expect(timeOfDay(r.dueAt!)).toBe('07:45');
    expect(day(r.dueAt)).toBe('2026-10-23');
    r = p('réunion samedi 14:30');
    expect(timeOfDay(r.dueAt!)).toBe('14:30');
    r = p('appel 18h');
    expect(timeOfDay(r.dueAt!)).toBe('18:00');
    expect(r.estimateMin).toBeNull();
  });

  it('tokens at the start of the sentence', () => {
    const r = p('Demain p1 appeler le garage');
    expect(r.title).toBe('Appeler le garage');
    expect(day(r.dueAt)).toBe('2026-10-23');
    expect(r.priority).toBe(1);
  });

  it('upper case and accents', () => {
    const r = p('Réserver Hôtel SAMEDI P2 30 MIN');
    expect(r.title).toBe('Réserver Hôtel');
    expect(day(r.dueAt)).toBe('2026-10-24');
    expect(r.priority).toBe(2);
    expect(r.estimateMin).toBe(30);
  });

  it('a date wins over an explicit horizon', () => {
    const r = p('ranger cette semaine demain');
    expect(r.horizon).toBeNull();
    expect(day(r.dueAt)).toBe('2026-10-23');
  });
});

describe('parseCapture — horizons', () => {
  it.each([
    ['un jour', 'someday'],
    ['un de ces jours', 'someday'],
    ['cette semaine', 'week'],
    ['ce mois-ci', 'month'],
    ['ce mois ci', 'month'],
  ])('%s', (tok, h) => {
    const r = p(`peindre le portail ${tok}`);
    expect(r.horizon).toBe(h);
    expect(r.title).toBe('Peindre le portail');
  });

  it('"semaine pro" = end of next week, "mois pro" = end of next month', () => {
    expect(day(p('vidange semaine pro').dueAt)).toBe('2026-11-01');
    expect(day(p('vidange la semaine prochaine').dueAt)).toBe('2026-11-01');
    expect(day(p('vidange mois pro').dueAt)).toBe('2026-11-30');
    expect(p('vidange mois prochain').title).toBe('Vidange');
  });
});

describe('parseCapture — leftovers', () => {
  it('keeps unrecognised tokens and words in the title', () => {
    expect(p('acheter 3 baguettes').title).toBe('Acheter 3 baguettes');
    expect(p('lire mars et vénus').dueAt).toBeNull();
    expect(p('').title).toBe('');
  });
  it('reports token positions in the original string', () => {
    const r = p('coiffeur samedi p2 15min');
    expect(r.tokens.map((t) => [t.kind, t.raw])).toEqual([
      ['date', 'samedi'],
      ['priority', 'p2'],
      ['duration', '15min'],
    ]);
  });
  it('drops a dangling connector', () => {
    expect(p('rendre les clés avant samedi').title).toBe('Rendre les clés');
  });
});
