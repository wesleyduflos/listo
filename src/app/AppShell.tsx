import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useData } from '../data/DataProvider';
import { BottomNav, Icon } from '../ui';
import { CaptureSheet } from '../features/capture/CaptureSheet';
import { TaskCompletionProvider } from '../features/tasks/useTaskCompletion';
import styles from './AppShell.module.css';

const TABS = ['/', '/horizons', '/preparations', '/routines'];

export function AppShell() {
  const { pathname } = useLocation();
  const [capturing, setCapturing] = useState(false);
  const { sync } = useData();
  const showNav = TABS.includes(pathname);

  // "n" opens the quick capture on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      e.preventDefault();
      setCapturing(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <TaskCompletionProvider>
      {sync !== 'synced' && (
        <div className={styles.sync} role="status">
          <Icon name={sync === 'offline' ? 'cloudOff' : 'refresh'} size={14} />
          {sync === 'offline' ? 'Hors ligne' : 'Synchronisation…'}
        </div>
      )}
      <Outlet />
      {showNav && <BottomNav onAdd={() => setCapturing(true)} />}
      <CaptureSheet open={capturing} onClose={() => setCapturing(false)} />
    </TaskCompletionProvider>
  );
}
