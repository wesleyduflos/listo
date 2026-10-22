import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useActions, useData } from '../data/DataProvider';
import { BottomNav, Icon } from '../ui';
import { CaptureSheet } from '../features/capture/CaptureSheet';
import { TaskCompletionProvider } from '../features/tasks/useTaskCompletion';
import styles from './AppShell.module.css';

const TABS = ['/', '/horizons', '/preparations', '/routines'];

export function AppShell() {
  const { pathname } = useLocation();
  const [capturing, setCapturing] = useState(false);
  const { sync, settings, ready } = useData();
  const actions = useActions();
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

  // Keep this device's push token fresh (lastSeenAt) when notifications are on.
  useEffect(() => {
    if (!ready || !settings.notificationsEnabled) return;
    import('../features/settings/push')
      .then((m) => m.refreshPushToken())
      .then((token) => (token ? actions.saveFcmToken(token) : undefined))
      .catch(() => undefined);
  }, [ready, settings.notificationsEnabled, actions]);

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
