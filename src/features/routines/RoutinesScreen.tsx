import { useState } from 'react';
import { useActions, useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { computeStreak } from '../../domain/routines';
import { dayKey } from '../../domain/time';
import type { Routine } from '../../domain/types';
import {
  BottomSheet,
  Button,
  Card,
  Empty,
  Icon,
  Screen,
  ScreenHeader,
  Switch,
  TextInput,
  ToggleChips,
  cx,
} from '../../ui';
import { WEEKDAYS } from './weekdays';
import styles from './RoutinesScreen.module.css';

export function RoutinesScreen() {
  const { routines, routineDays } = useData();
  const actions = useActions();
  const now = useNow();
  const [editing, setEditing] = useState<Routine | 'new' | null>(null);
  const streak = computeStreak(routineDays, now);
  const today = routineDays[dayKey(now)];

  return (
    <Screen>
      <ScreenHeader title="Routines" />
      <div className={styles.tiles}>
        <div className={cx(styles.tile, styles.dark)}>
          <span className={styles.tileLabel}>Série actuelle</span>
          <span className={styles.tileValue}>{streak.current} j</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Meilleure série</span>
          <span className={styles.tileValue}>{streak.best} j</span>
        </div>
      </div>
      {routines.length === 0 ? (
        <Empty>
          Aucune routine. Les routines reviennent les jours choisis et ne sont jamais en retard.
        </Empty>
      ) : (
        <Card className={styles.list}>
          {routines.map((r) => (
            <div key={r.id} className={cx(styles.row, !r.active && styles.inactive)}>
              <button type="button" className={styles.main} onClick={() => setEditing(r)}>
                <span className={styles.title}>{r.title}</span>
                <span
                  className={styles.days}
                  aria-label={`Jours : ${WEEKDAYS.filter((w) => r.weekdays.includes(w.value))
                    .map((w) => w.full)
                    .join(', ')}`}
                >
                  {WEEKDAYS.map((w) => (
                    <span
                      key={w.value}
                      className={cx(styles.day, r.weekdays.includes(w.value) && styles.dayOn)}
                      aria-hidden="true"
                    >
                      {w.label}
                    </span>
                  ))}
                </span>
              </button>
              <Switch
                checked={r.active}
                label={`Activer ${r.title}`}
                onChange={(v) => actions.updateRoutine(r, { active: v }, today)}
              />
            </div>
          ))}
        </Card>
      )}
      <Button size="lg" block onClick={() => setEditing('new')}>
        <Icon name="plus" size={20} /> Nouvelle routine
      </Button>
      {editing && (
        <RoutineSheet
          routine={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(title, weekdays) => {
            if (editing === 'new') actions.createRoutine(title, weekdays, today, routines.length);
            else actions.updateRoutine(editing, { title, weekdays }, today);
          }}
          onDelete={editing === 'new' ? undefined : () => actions.deleteRoutine(editing, today)}
        />
      )}
    </Screen>
  );
}

function RoutineSheet({
  routine,
  onClose,
  onSave,
  onDelete,
}: {
  routine: Routine | null;
  onClose: () => void;
  onSave: (title: string, weekdays: number[]) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(routine?.title ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? [1, 2, 3, 4, 5, 6, 7]);
  const toggle = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  const label = routine ? 'Modifier la routine' : 'Nouvelle routine';
  return (
    <BottomSheet open onClose={onClose} label={label} title={label}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || weekdays.length === 0) return;
          onSave(title.trim(), weekdays);
          onClose();
        }}
      >
        <TextInput
          label="Routine"
          value={title}
          autoFocus={!routine}
          placeholder="ex. Arroser les plantes"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Jours</span>
          <ToggleChips
            label="Jours de la semaine"
            options={WEEKDAYS}
            values={weekdays}
            onToggle={toggle}
          />
          <div className={styles.presets}>
            <button type="button" onClick={() => setWeekdays([1, 2, 3, 4, 5, 6, 7])}>
              Tous les jours
            </button>
            <button type="button" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>
              En semaine
            </button>
            <button type="button" onClick={() => setWeekdays([6, 7])}>
              Le week-end
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" block disabled={!title.trim() || weekdays.length === 0}>
          Enregistrer
        </Button>
        {onDelete && (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Supprimer cette routine ?')) {
                onDelete();
                onClose();
              }
            }}
          >
            Supprimer
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}
