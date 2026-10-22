import { useMemo, useState } from 'react';
import { useActions, useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { formatDuration, lateSinceLabel, longDate, shortDay } from '../../domain/format';
import { groupTasks, sumEstimates, todayView } from '../../domain/grouping';
import { isLate } from '../../domain/horizons';
import { computeStreak } from '../../domain/routines';
import { addDaysTz, atTimeTz, dayKey, endOfDayTz, isSameDayTz, timeOfDay } from '../../domain/time';
import type { Task } from '../../domain/types';
import {
  BackLink,
  Button,
  Card,
  Empty,
  Overline,
  Screen,
  ScreenHeader,
  cx,
  useSnackbar,
} from '../../ui';
import { DateSheet } from '../tasks/DateSheet';
import styles from './ReviewScreen.module.css';

const MAX_CELLS = 24;

export function ReviewScreen() {
  const { tasks, routineDays, preparations } = useData();
  const actions = useActions();
  const snackbar = useSnackbar();
  const now = useNow();
  const [picking, setPicking] = useState<Task | null>(null);

  const view = useMemo(() => todayView(tasks, now), [tasks, now]);
  const pending = [...view.late, ...view.today, ...view.prepToday];
  const doneMinutes = sumEstimates(view.done);
  const day = routineDays[dayKey(now)];
  const routinesDone = day ? day.planned.filter((id) => day.done.includes(id)).length : 0;
  const streak = computeStreak(routineDays, now);

  const tomorrow = addDaysTz(now, 1);
  const tomorrowMorning = atTimeTz(tomorrow, '08:00');
  const tomorrowGroups = groupTasks(tasks, tomorrowMorning);
  const tomorrowTasks = [...tomorrowGroups.late, ...tomorrowGroups.today];
  const departures = preparations.filter(
    (p) => p.status === 'active' && isSameDayTz(p.departAt, tomorrow),
  );

  const cells = Math.min(view.total, MAX_CELLS);
  const doneCells =
    view.total > MAX_CELLS ? Math.round((view.doneCount / view.total) * MAX_CELLS) : view.doneCount;

  const decide = (task: Task, label: string, apply: () => void, undo: () => void) => {
    apply();
    snackbar.show({
      message: `« ${task.title} » ${label}`,
      actionLabel: 'Annuler',
      onAction: undo,
    });
  };

  const tomorrowBits = [
    `${tomorrowTasks.length} tâche${tomorrowTasks.length > 1 ? 's' : ''}`,
    sumEstimates(tomorrowTasks) ? formatDuration(sumEstimates(tomorrowTasks)) : null,
    ...departures.map((p) => `départ ${p.name} à ${timeOfDay(p.departAt)}`),
  ].filter(Boolean);

  return (
    <Screen noNav>
      <BackLink to="/" label="Aujourd'hui" />
      <ScreenHeader meta={`${longDate(now)} · ${timeOfDay(now)}`} title="Bilan du soir" />

      <section className={styles.summary} aria-label="Résumé de la journée">
        <div className={styles.counter}>
          <span className={styles.big}>
            {view.doneCount}/{view.total}
          </span>
          <span className={styles.bigLabel}>tâches bouclées</span>
        </div>
        {cells > 0 && (
          <div className={styles.cells} aria-hidden="true">
            {Array.from({ length: cells }, (_, i) => (
              <span key={i} className={cx(styles.cell, i < doneCells && styles.cellDone)} />
            ))}
          </div>
        )}
        <dl className={styles.stats}>
          <div>
            <dt>temps estimé fait</dt>
            <dd>{formatDuration(doneMinutes)}</dd>
          </div>
          <div>
            <dt>routines</dt>
            <dd>
              {routinesDone}/{day?.planned.length ?? 0}
            </dd>
          </div>
          <div>
            <dt>routines d’affilée</dt>
            <dd className={styles.accent}>{streak.current} j</dd>
          </div>
        </dl>
      </section>

      <Overline>Pas faites aujourd’hui · {pending.length}</Overline>
      {pending.length === 0 && <Empty>Tout est bouclé. Bonne soirée.</Empty>}
      {pending.map((t) => (
        <Card key={t.id} className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>{t.title}</span>
            <span className={cx(styles.cardMeta, isLate(t, now) && styles.late)}>
              {isLate(t, now)
                ? lateSinceLabel(t.dueAt!, now)
                : t.dueAt
                  ? t.dueHasTime
                    ? `Échéance ${timeOfDay(t.dueAt)}`
                    : 'Échéance aujourd’hui'
                  : 'Sans échéance'}
            </span>
          </div>
          <div className={styles.buttons}>
            <Button
              onClick={() => {
                const before = { dueAt: t.dueAt, dueHasTime: t.dueHasTime, horizon: t.horizon };
                decide(
                  t,
                  'reportée à demain',
                  () =>
                    actions.updateTask(t.id, { dueAt: endOfDayTz(tomorrow), dueHasTime: false }),
                  () => actions.updateTask(t.id, before),
                );
              }}
            >
              Demain
            </Button>
            <Button variant="secondary" onClick={() => setPicking(t)}>
              Choisir une date
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                decide(
                  t,
                  'abandonnée',
                  () => actions.abandonTask(t),
                  () => actions.reopenTask(t),
                )
              }
            >
              Abandonner
            </Button>
          </div>
        </Card>
      ))}

      <Overline>Demain · {shortDay(tomorrow)}</Overline>
      <p className={styles.tomorrow}>{tomorrowBits.join(' · ')}</p>

      {picking && (
        <DateSheet
          open
          now={now}
          onClose={() => setPicking(null)}
          onPick={(v) => actions.updateTask(picking.id, v)}
        />
      )}
    </Screen>
  );
}
