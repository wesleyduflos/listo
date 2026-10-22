import { NavLink } from 'react-router-dom';
import { cx } from './cx';
import { Icon } from './Icon';
import styles from './BottomNav.module.css';

const LEFT = [
  { to: '/', label: "Aujourd'hui", end: true },
  { to: '/horizons', label: 'Horizons' },
];
const RIGHT = [
  { to: '/preparations', label: 'Préparations' },
  { to: '/routines', label: 'Routines' },
];

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const link = (l: { to: string; label: string; end?: boolean }) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      className={({ isActive }) => cx(styles.link, isActive && styles.active)}
    >
      {l.label}
    </NavLink>
  );
  return (
    <nav className={styles.nav} aria-label="Navigation principale">
      {LEFT.map(link)}
      <button
        type="button"
        className={styles.fab}
        onClick={onAdd}
        aria-label="Nouvelle tâche"
        aria-keyshortcuts="n"
      >
        <Icon name="plus" size={26} strokeWidth={2} />
      </button>
      {RIGHT.map(link)}
    </nav>
  );
}
