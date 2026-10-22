import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, DataProvider, useAuth } from '../data/DataProvider';
import { LoginScreen } from '../features/auth/LoginScreen';
import { TodayScreen } from '../features/today/TodayScreen';
import { SnackbarProvider } from '../ui';
import { AppShell } from './AppShell';
import { WriteErrors } from './WriteErrors';

const HorizonsScreen = lazy(() =>
  import('../features/horizons/HorizonsScreen').then((m) => ({ default: m.HorizonsScreen })),
);
const PreparationsScreen = lazy(() =>
  import('../features/preparations/PreparationsScreen').then((m) => ({
    default: m.PreparationsScreen,
  })),
);
const PreparationDetailScreen = lazy(() =>
  import('../features/preparations/PreparationDetailScreen').then((m) => ({
    default: m.PreparationDetailScreen,
  })),
);
const TemplatesScreen = lazy(() =>
  import('../features/preparations/TemplatesScreen').then((m) => ({ default: m.TemplatesScreen })),
);
const TemplateEditorScreen = lazy(() =>
  import('../features/preparations/TemplateEditorScreen').then((m) => ({
    default: m.TemplateEditorScreen,
  })),
);
const ListsScreen = lazy(() =>
  import('../features/lists/ListsScreen').then((m) => ({ default: m.ListsScreen })),
);
const ListEditorScreen = lazy(() =>
  import('../features/lists/ListEditorScreen').then((m) => ({ default: m.ListEditorScreen })),
);
const RoutinesScreen = lazy(() =>
  import('../features/routines/RoutinesScreen').then((m) => ({ default: m.RoutinesScreen })),
);
const ReviewScreen = lazy(() =>
  import('../features/review/ReviewScreen').then((m) => ({ default: m.ReviewScreen })),
);
const SettingsScreen = lazy(() =>
  import('../features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const TaskEditorScreen = lazy(() =>
  import('../features/tasks/TaskEditorScreen').then((m) => ({ default: m.TaskEditorScreen })),
);

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginScreen />;
  return (
    <DataProvider uid={user.uid}>
      <WriteErrors />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<TodayScreen />} />
            <Route path="horizons" element={<HorizonsScreen />} />
            <Route path="preparations" element={<PreparationsScreen />} />
            <Route path="preparations/:id" element={<PreparationDetailScreen />} />
            <Route path="modeles" element={<TemplatesScreen />} />
            <Route path="modeles/:id" element={<TemplateEditorScreen />} />
            <Route path="listes" element={<ListsScreen />} />
            <Route path="listes/:id" element={<ListEditorScreen />} />
            <Route path="routines" element={<RoutinesScreen />} />
            <Route path="bilan" element={<ReviewScreen />} />
            <Route path="parametres" element={<SettingsScreen />} />
            <Route path="taches/:id" element={<TaskEditorScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </DataProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </SnackbarProvider>
    </BrowserRouter>
  );
}
