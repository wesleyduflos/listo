import styles from './ProgressRing.module.css';

export interface ProgressRingProps {
  value: number;
  total: number;
  size?: number;
  /** Shown under the ring when everything is done. */
  doneCaption?: string;
}

export function ProgressRing({ value, total, size = 56, doneCaption }: ProgressRingProps) {
  const stroke = 5;
  const r = (size - stroke) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, value / total) : 0;
  const complete = total > 0 && value >= total;
  return (
    <div className={styles.wrap}>
      <svg
        className={styles.ring}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={complete ? 'Journée bouclée' : `${value} tâches sur ${total} terminées`}
      >
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={styles.value}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={ratio === 0 ? 0 : 1}
        />
        <text className={styles.text} x="50%" y="50%" dy="0.35em" textAnchor="middle">
          {value}/{total}
        </text>
      </svg>
      {complete && doneCaption && <span className={styles.caption}>{doneCaption}</span>}
    </div>
  );
}
