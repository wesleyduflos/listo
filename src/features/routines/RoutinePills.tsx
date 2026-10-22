import type { Routine, RoutineDay } from '../../domain/types';
import { Icon, cx } from '../../ui';
import styles from './RoutinePills.module.css';

export function RoutinePills({
  routines,
  day,
  onToggle,
}: {
  routines: Routine[];
  day: RoutineDay | undefined;
  onToggle: (id: string, done: boolean) => void;
}) {
  const planned = (day?.planned ?? [])
    .map((id) => routines.find((r) => r.id === id))
    .filter((r): r is Routine => !!r);
  if (planned.length === 0)
    return <p className={styles.none}>Aucune routine prévue aujourd’hui.</p>;
  return (
    <ul className={styles.pills} aria-label="Routines du jour">
      {planned.map((r) => {
        const done = day!.done.includes(r.id);
        return (
          <li key={r.id}>
            <button
              type="button"
              className={cx(styles.pill, done && styles.done)}
              aria-pressed={done}
              onClick={() => {
                if (!done) navigator.vibrate?.(10);
                onToggle(r.id, !done);
              }}
            >
              {done && <Icon name="check" size={16} strokeWidth={2.4} />}
              {r.title}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
