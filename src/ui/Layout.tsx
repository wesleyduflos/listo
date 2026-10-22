import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import styles from './Layout.module.css';

export function Screen({
  children,
  noNav,
  className,
}: {
  children: ReactNode;
  noNav?: boolean;
  className?: string;
}) {
  return <main className={cx(styles.screen, noNav && styles.noNav, className)}>{children}</main>;
}

export function ScreenHeader({
  title,
  meta,
  aside,
}: {
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        {meta && <div className={styles.meta}>{meta}</div>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {aside}
    </header>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={styles.back}>
      <Icon name="chevronLeft" size={22} />
      {label}
    </Link>
  );
}

export function Overline({
  children,
  aside,
  className,
  id,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <h2 className={cx(styles.overline, className)} id={id}>
      <span>{children}</span>
      {aside && <span className={styles.overlineAside}>{aside}</span>}
    </h2>
  );
}

export function IconButton({
  icon,
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={22} />
    </button>
  );
}

export function Row({
  icon,
  label,
  value,
  onClick,
  to,
}: {
  icon?: IconName;
  label: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  to?: string;
}) {
  const body = (
    <>
      {icon && <Icon name={icon} size={20} />}
      <span className={styles.rowLabel}>{label}</span>
      {value !== undefined && <span className={styles.rowValue}>{value}</span>}
      {(to || onClick) && <Icon name="chevronRight" size={18} style={{ color: 'var(--muted)' }} />}
    </>
  );
  if (to)
    return (
      <Link to={to} className={styles.row}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={styles.row} onClick={onClick}>
        {body}
      </button>
    );
  return <div className={styles.row}>{body}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
