import { useMemo, useState } from 'react';
import { useActions, useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { groupTasks } from '../../domain/grouping';
import { somedayNudge } from '../../domain/nudge';
import { endOfMonthTz, endOfWeekTz, formatTz } from '../../domain/time';
import type { Group, Horizon, Task } from '../../domain/types';
import { Empty, Overline, Screen, ScreenHeader, SegmentedControl, cx } from '../../ui';
import { TaskMenuSheet } from '../tasks/TaskMenuSheet';
import { TaskRow } from '../tasks/TaskRow';
import { NudgeCard } from './NudgeCard';
import styles from './HorizonsScreen.module.css';

type Filter = 'all' | 'week' | 'month' | 'someday';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'someday', label: 'Un jour' },
];

const VISIBLE: Record<Filter, Group[]> = {
  all: ['week', 'month', 'later', 'someday'],
  week: ['week'],
  month: ['month'],
  someday: ['someday'],
};

const DROP_HORIZON: Partial<Record<Group, Horizon>> = {
  week: 'week',
  month: 'month',
  someday: 'someday',
};

export function HorizonsScreen() {
  const { tasks, preparations, settings } = useData();
  const actions = useActions();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<Group | null>(null);
  const groups = useMemo(() => groupTasks(tasks, now), [tasks, now]);
  const prepName = (t: Task) =>
    t.prepId ? preparations.find((p) => p.id === t.prepId)?.name : undefined;
  const nudge = somedayNudge(tasks, now, settings.somedayNudgeDays);

  const meta: Record<Group, { title: string; aside: string }> = {
    late: { title: 'En retard', aside: '' },
    today: { title: "Aujourd'hui", aside: '' },
    week: { title: 'Cette semaine', aside: `→ ${formatTz(endOfWeekTz(now), 'EEE d')}` },
    month: { title: 'Ce mois-ci', aside: `→ ${formatTz(endOfMonthTz(now), 'd MMM')}` },
    later: { title: 'Plus tard', aside: `après le ${formatTz(endOfMonthTz(now), 'd MMM')}` },
    someday: { title: 'Un jour', aside: 'sans date' },
  };

  const visible = VISIBLE[filter];
  const empty = visible.every((g) => groups[g].length === 0);

  return (
    <Screen>
      <ScreenHeader title="Horizons" />
      <SegmentedControl
        label="Filtrer les horizons"
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      {visible.map((g) => {
        const list = groups[g];
        if (list.length === 0 && !(dropTarget && DROP_HORIZON[g])) return null;
        const droppable = !!DROP_HORIZON[g];
        return (
          <section
            key={g}
            aria-labelledby={`h-${g}`}
            className={cx(styles.group, dropTarget === g && styles.drop)}
            onDragOver={(e) => {
              if (!droppable || !e.dataTransfer.types.includes('text/listo-task')) return;
              e.preventDefault();
              setDropTarget(g);
            }}
            onDragLeave={() => setDropTarget((d) => (d === g ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDropTarget(null);
              const id = e.dataTransfer.getData('text/listo-task');
              const task = tasks.find((t) => t.id === id);
              if (task && !task.dueAt && DROP_HORIZON[g] && task.horizon !== DROP_HORIZON[g]) {
                actions.updateTask(id, { horizon: DROP_HORIZON[g] });
              }
            }}
          >
            <Overline id={`h-${g}`} aside={meta[g].aside}>
              {meta[g].title}
            </Overline>
            <div className={styles.list}>
              {list.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  context="horizons"
                  plain
                  prepName={prepName(t)}
                  onMenu={setMenuTask}
                  draggable={!t.dueAt}
                />
              ))}
              {list.length === 0 && <p className={styles.dropHint}>Déposer ici</p>}
            </div>
          </section>
        );
      })}

      {empty && <Empty>Rien à l’horizon. Profitez-en.</Empty>}

      {nudge && (filter === 'all' || filter === 'someday') && (
        <NudgeCard
          task={nudge.task}
          days={nudge.days}
          onRaise={() => actions.updateTask(nudge.task.id, { horizon: 'month' })}
          onLater={() => actions.updateTask(nudge.task.id, {})}
        />
      )}

      <TaskMenuSheet task={menuTask} now={now} onClose={() => setMenuTask(null)} />
    </Screen>
  );
}
