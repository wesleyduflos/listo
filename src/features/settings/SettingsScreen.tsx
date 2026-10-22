import { signOut } from 'firebase/auth';
import { useActions, useAuth, useData } from '../../data/DataProvider';
import type { Priority } from '../../domain/types';
import { auth } from '../../lib/firebase';
import {
  BackLink,
  Button,
  Card,
  ChoiceChips,
  Icon,
  Overline,
  Screen,
  ScreenHeader,
  inputClass,
} from '../../ui';
import { PRIORITY_OPTIONS } from '../tasks/fields';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { settings, sync } = useData();
  const { user } = useAuth();
  const actions = useActions();

  const exportJson = async () => {
    const data = await actions.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listo-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen noNav>
      <BackLink to="/" label="Aujourd'hui" />
      <ScreenHeader title="Paramètres" />

      <Overline>Tâches</Overline>
      <Card className={styles.card}>
        <div className={styles.stack}>
          <span className={styles.rowTitle}>Priorité par défaut</span>
          <ChoiceChips
            label="Priorité par défaut"
            options={PRIORITY_OPTIONS}
            value={settings.defaultPriority}
            onChange={(p: Priority) => actions.updateSettings({ defaultPriority: p })}
          />
        </div>
        <label className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Relance « Un jour »</span>
            <span className={styles.rowHint}>
              Jours sans modification avant de proposer de la remonter.
            </span>
          </span>
          <input
            type="number"
            min={1}
            className={`${inputClass} ${styles.number}`}
            value={settings.somedayNudgeDays}
            onChange={(e) =>
              Number(e.target.value) > 0 &&
              actions.updateSettings({ somedayNudgeDays: Number(e.target.value) })
            }
          />
        </label>
      </Card>

      <Overline>Données</Overline>
      <Card className={styles.card}>
        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Synchronisation</span>
            <span className={styles.rowHint}>
              {sync === 'offline'
                ? 'Hors ligne : les modifications seront envoyées au retour du réseau.'
                : sync === 'pending'
                  ? 'Envoi en cours…'
                  : 'À jour.'}
            </span>
          </span>
        </div>
        <Button variant="secondary" onClick={exportJson}>
          <Icon name="download" size={18} /> Exporter mes données (JSON)
        </Button>
      </Card>

      <Overline>Compte</Overline>
      <Card className={styles.card}>
        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>{user?.displayName ?? 'Connecté'}</span>
            <span className={styles.rowHint}>{user?.email}</span>
          </span>
        </div>
        <Button variant="danger" onClick={() => signOut(auth)}>
          <Icon name="logOut" size={18} /> Se déconnecter
        </Button>
      </Card>
      <p className={styles.version}>Listo · v{__APP_VERSION__}</p>
    </Screen>
  );
}
