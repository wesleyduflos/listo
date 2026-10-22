import { useState } from 'react';
import { cx } from './cx';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  shape?: 'round' | 'square';
  tone?: 'default' | 'late' | 'dark';
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  shape = 'round',
  tone = 'default',
  className,
}: CheckboxProps) {
  const [animate, setAnimate] = useState(false);
  const size = shape === 'round' ? 14 : 12;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cx(
        styles.box,
        shape === 'square' && styles.square,
        tone !== 'default' && styles[tone],
        checked && styles.checked,
        animate && styles.animate,
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!checked) {
          setAnimate(true);
          navigator.vibrate?.(10);
        }
        onChange(!checked);
      }}
    >
      <span className={styles.mark}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            className={styles.path}
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
