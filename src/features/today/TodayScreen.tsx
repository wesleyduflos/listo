import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { longDate } from '../../domain/format';
import { todayView } from '../../domain/grouping';
import { isPrepActive } from '../../domain/preparations';
import { calendarDiff, dayKey, minutesOfDay } from '../../domain/time';
import type { Task } from '../../domain/types';
import { Card, Empty, Icon, IconButton, ProgressRing, Screen, ScreenHeader } from '../../ui';
import { PrepCard } from '../preparations/PrepCard';
import { RoutinePills } from '../routines/RoutinePills';
import { TaskMenuSheet } from '../tasks/TaskMenuSheet';
import { TaskRow } from '../tasks/TaskRow';
import styles from './TodayScreen.module.css';

const REVIEW_FROM_MIN = 18 * 60;

export function TodayScreen() {
  const { tasks, preparations, routines, routineDays, ready } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const now = useNow();
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const [showRoutines, setShowRoutines] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const view = useMemo(() => todayView(tasks, now), [tasks, now]);
  const prepById = useMemo(
    () => Object.fromEntries(preparations.map((p) => [p.id, p])),
    [preparations],
  );
  const prepCards = preparations
    .filter((p) => isPrepActive(p, now))
    .map((p) => ({ prep: p, steps: tasks.filter((t) => t.prepId === p.id) }))
    .filter(({ steps }) =>
      steps.some((t) => t.status === 'open' && t.dueAt && calendarDiff(t.dueAt, now) <= 1),
    );

  const key = dayKey(now);
  const day = routineDays[key];
  const routinesDone = day ? day.planned.filter((id) => day.done.includes(id)).length : 0;
  const routinesTotal = day?.planned.length ?? 0;
  const lateIds = new Set(view.late.map((t) => t.id));
  const nothing = ready && view.total === 0 && prepCards.length === 0;

  return (
    <Screen>
      <ScreenHeader
        meta={longDate(now)}
        title="Aujourd'hui"
        aside={
          <div className={styles.aside}>
            <IconButton
              icon="settings"
              label="Paramètres"
              onClick={() => navigate('/parametres')}
            />
            <ProgressRing value={view.doneCount} total={view.total} doneCaption="Journée bouclée" />
          </div>
        }
      />

      {view.late.length > 0 && (
        <section aria-label="En retard" className={styles.stack}>
          {view.late.map((t) => (
            <Card key={t.id} tone="late" className={styles.lateCard}>
              <TaskRow
                task={t}
                now={now}
                context="today"
                onMenu={setMenuTask}
                prepName={t.prepId ? prepById[t.prepId]?.name : undefined}
              />
            </Card>
          ))}
        </section>
      )}

      {prepCards.map(({ prep, steps }) => (
        <PrepCard key={prep.id} prep={prep} tasks={steps} now={now} />
      ))}

      {view.today.length > 0 && (
        <Card className={styles.listCard} aria-label="Tâches du jour">
          {view.today
            .filter((t) => !lateIds.has(t.id))
            .map((t) => (
              <TaskRow key={t.id} task={t} now={now} context="today" onMenu={setMenuTask} />
            ))}
        </Card>
      )}

      {/* Today's preparation steps without a visible preparation card. */}
      {view.prepToday.some((t) => !prepCards.some((c) => c.prep.id === t.prepId)) && (
        <Card className={styles.listCard}>
          {view.prepToday
            .filter((t) => !prepCards.some((c) => c.prep.id === t.prepId))
            .map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                now={now}
                context="today"
                onMenu={setMenuTask}
                prepName={prepById[t.prepId!]?.name}
              />
            ))}
        </Card>
      )}

      {nothing && (
        <Empty>
          Rien de prévu aujourd’hui.
          <br />
          Touchez + pour ajouter une tâche.
        </Empty>
      )}

      <div className={styles.summary}>
        <button
          type="button"
          className={styles.summaryButton}
          aria-expanded={showRoutines}
          onClick={() => setShowRoutines((v) => !v)}
        >
          Routines ·{' '}
          <span className="mono">
            {routinesDone}/{routinesTotal}
          </span>{' '}
          faites
        </button>
        {view.done.length > 0 && (
          <button
            type="button"
            className={styles.summaryButton}
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
          >
            {view.done.length} terminée{view.done.length > 1 ? 's' : ''}{' '}
            <Icon name={showDone ? 'chevronDown' : 'chevronRight'} size={16} />
          </button>
        )}
      </div>

      {showRoutines && (
        <RoutinePills
          routines={routines}
          day={day}
          onToggle={(id, done) => actions.toggleRoutine(id, key, done)}
        />
      )}

      {showDone && view.done.length > 0 && (
        <div className={styles.doneList}>
          {view.done.map((t) => (
            <TaskRow key={t.id} task={t} now={now} context="done" plain hidePriority />
          ))}
        </div>
      )}

      {minutesOfDay(now) >= REVIEW_FROM_MIN && (
        <Link to="/bilan" className={styles.review}>
          <Icon name="moon" size={16} /> Bilan du soir
        </Link>
      )}

      <TaskMenuSheet task={menuTask} now={now} onClose={() => setMenuTask(null)} />
    </Screen>
  );
}
