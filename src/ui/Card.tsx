import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'dark' | 'late' | 'accent';
  flush?: boolean;
}

export function Card({ tone = 'default', flush, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        styles.card,
        tone !== 'default' && styles[tone],
        flush && styles.flush,
        className,
      )}
      {...rest}
    />
  );
}
