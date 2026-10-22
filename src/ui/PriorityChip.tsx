import type { Priority } from '../domain/types';
import { cx } from './cx';
import styles from './PriorityChip.module.css';

export function PriorityChip({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cx(styles.chip, styles[`p${priority}`], className)}
      aria-label={`Priorité ${priority}`}
    >
      P{priority}
    </span>
  );
}
