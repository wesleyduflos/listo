import { cx } from './cx';
import styles from './ProgressBar.module.css';

export function ProgressBar({
  value,
  total,
  tone = 'light',
  label,
}: {
  value: number;
  total: number;
  tone?: 'light' | 'dark';
  label?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={cx(styles.track, tone === 'dark' && styles.dark)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
