import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  onSnapshot,
  query,
  where,
  type Query,
  type DocumentReference,
  type QuerySnapshot,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { missingDayKeys, routinesForDay } from '../domain/routines';
import { addDaysTz, dayKey, fromDayKey, startOfDayTz } from '../domain/time';
import {
  DEFAULT_SETTINGS,
  type Preparation,
  type PrepTemplate,
  type ReusableList,
  type Routine,
  type RoutineDay,
  type Settings,
  type Task,
} from '../domain/types';
import { auth } from '../lib/firebase';
import { createActions, type Actions } from './actions';
import {
  listFromDoc,
  prepFromDoc,
  routineDayFromDoc,
  routineFromDoc,
  settingsFromDoc,
  taskFromDoc,
  templateFromDoc,
  ts,
} from './converters';
import { col, userDoc } from './paths';
import { useNow } from './useNow';

export type SyncState = 'synced' | 'pending' | 'offline';

export interface DataState {
  ready: boolean;
  tasks: Task[];
  routines: Routine[];
  routineDays: Record<string, RoutineDay>;
  lists: ReusableList[];
  templates: PrepTemplate[];
  preparations: Preparation[];
  settings: Settings;
  sync: SyncState;
}

const EMPTY: DataState = {
  ready: false,
  tasks: [],
  routines: [],
  routineDays: {},
  lists: [],
  templates: [],
  preparations: [],
  settings: DEFAULT_SETTINGS,
  sync: 'synced',
};

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });
const DataContext = createContext<DataState>(EMPTY);
const ActionsContext = createContext<Actions | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: auth.currentUser, loading: true });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Subscribes to every collection of the signed-in user and keeps app-level invariants. */
export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [state, setState] = useState<DataState>(EMPTY);
  const [serverSeen, setServerSeen] = useState({ user: false, routineDays: false });
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const actions = useMemo(() => createActions(uid), [uid]);
  const now = useNow();
  const todayKey = dayKey(now);

  useEffect(() => {
    const set = <K extends keyof DataState>(k: K, v: DataState[K]) =>
      setState((s) => ({ ...s, [k]: v }));
    const loaded = new Set<string>();
    const markLoaded = (k: string) => {
      loaded.add(k);
      if (loaded.size >= 7) setState((s) => (s.ready ? s : { ...s, ready: true }));
    };
    const pendingByKey: Record<string, boolean> = {};
    const track = (k: string, pendingWrites: boolean) => {
      pendingByKey[k] = pendingWrites;
      setPending(Object.values(pendingByKey).some(Boolean));
    };
    const listen = <T extends QuerySnapshot | DocumentSnapshot>(
      k: string,
      target: Query | DocumentReference,
      cb: (snap: T) => void,
    ): Unsubscribe =>
      onSnapshot(target as Query, { includeMetadataChanges: true }, (snap) => {
        track(k, snap.metadata.hasPendingWrites);
        cb(snap as unknown as T);
      });
    let openTasks: Task[] = [];
    let recent: Task[] = [];
    const pushTasks = () =>
      set('tasks', [...openTasks, ...recent.filter((t) => !openTasks.some((o) => o.id === t.id))]);
    const subs: Unsubscribe[] = [
      listen<QuerySnapshot>(
        'open',
        query(col(uid, 'tasks'), where('status', '==', 'open')),
        (snap) => {
          openTasks = snap.docs.map((d) => taskFromDoc(d.id, d.data()));
          pushTasks();
          markLoaded('open');
        },
      ),
      listen<QuerySnapshot>(
        'recent',
        // Done today and earlier this week: enough for "terminées", the review and undo.
        query(
          col(uid, 'tasks'),
          where('completedAt', '>=', ts(startOfDayTz(addDaysTz(new Date(), -7)))),
        ),
        (snap) => {
          recent = snap.docs.map((d) => taskFromDoc(d.id, d.data()));
          pushTasks();
          markLoaded('recent');
        },
      ),
      listen<QuerySnapshot>('routines', col(uid, 'routines'), (snap) => {
        set(
          'routines',
          snap.docs.map((d) => routineFromDoc(d.id, d.data())).sort((a, b) => a.order - b.order),
        );
        markLoaded('routines');
      }),
      listen<QuerySnapshot>('routineDays', col(uid, 'routineDays'), (snap) => {
        set(
          'routineDays',
          Object.fromEntries(snap.docs.map((d) => [d.id, routineDayFromDoc(d.data())])),
        );
        if (!snap.metadata.fromCache) setServerSeen((s) => ({ ...s, routineDays: true }));
        markLoaded('routineDays');
      }),
      listen<QuerySnapshot>('lists', col(uid, 'lists'), (snap) => {
        set(
          'lists',
          snap.docs
            .map((d) => listFromDoc(d.id, d.data()))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        );
        markLoaded('lists');
      }),
      listen<QuerySnapshot>('templates', col(uid, 'prepTemplates'), (snap) => {
        set(
          'templates',
          snap.docs
            .map((d) => templateFromDoc(d.id, d.data()))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        );
        markLoaded('templates');
      }),
      listen<QuerySnapshot>('preparations', col(uid, 'preparations'), (snap) => {
        set(
          'preparations',
          snap.docs
            .map((d) => prepFromDoc(d.id, d.data()))
            .sort((a, b) => a.departAt.getTime() - b.departAt.getTime()),
        );
        markLoaded('preparations');
      }),
      listen<DocumentSnapshot>('user', userDoc(uid), (snap) => {
        set('settings', settingsFromDoc(snap.data()));
        if (!snap.metadata.fromCache) setServerSeen((s) => ({ ...s, user: true }));
      }),
    ];
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      subs.forEach((u) => u());
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [uid]);

  // First launch: seed the template and list once the server confirms nothing exists.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !serverSeen.user || state.settings.seeded) return;
    seededRef.current = true;
    actions.seed();
  }, [serverSeen.user, state.settings.seeded, actions]);

  // Freeze today's routine plan at first opening, backfilling skipped days.
  const plannedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.ready || plannedRef.current === todayKey) return;
    if (!serverSeen.routineDays && online) return;
    plannedRef.current = todayKey;
    if (state.routineDays[todayKey]) return;
    const keys = Object.keys(state.routineDays).sort();
    const last = keys.length ? keys[keys.length - 1] : null;
    const writes: Record<string, RoutineDay> = {};
    for (const k of missingDayKeys(last, now)) {
      writes[k] = {
        planned: routinesForDay(state.routines, fromDayKey(k)).map((r) => r.id),
        done: [],
      };
    }
    writes[todayKey] = { planned: routinesForDay(state.routines, now).map((r) => r.id), done: [] };
    actions.writeRoutineDays(writes);
  }, [
    state.ready,
    state.routineDays,
    state.routines,
    serverSeen.routineDays,
    online,
    todayKey,
    now,
    actions,
  ]);

  // A preparation is over once its departure has passed (§3.8).
  useEffect(() => {
    if (!state.ready) return;
    for (const p of state.preparations) {
      if (p.status === 'active' && p.departAt.getTime() <= now.getTime())
        actions.markPreparationDone(p.id);
    }
  }, [state.ready, state.preparations, now, actions]);

  const value = useMemo<DataState>(
    () => ({ ...state, sync: !online ? 'offline' : pending ? 'pending' : 'synced' }),
    [state, online, pending],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <DataContext.Provider value={value}>{children}</DataContext.Provider>
    </ActionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);
// eslint-disable-next-line react-refresh/only-export-components
export function useActions(): Actions {
  const a = useContext(ActionsContext);
  if (!a) throw new Error('useActions outside DataProvider');
  return a;
}
