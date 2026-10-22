import { signOut } from 'firebase/auth';
import { useState } from 'react';
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
  Switch,
  inputClass,
  useSnackbar,
} from '../../ui';
import { PRIORITY_OPTIONS } from '../tasks/fields';
import { disablePush, enablePush, isIos, isStandalone } from './push';
import styles from './SettingsScreen.module.css';

const PUSH_ERRORS: Record<string, string> = {
  denied: 'Notifications refusées. Autorisez-les dans les réglages du navigateur.',
  unsupported: 'Notifications non disponibles sur cet appareil ou ce navigateur.',
  'missing-vapid-key': 'Clé VAPID manquante dans la configuration.',
};

export function SettingsScreen() {
  const { settings, sync } = useData();
  const { user } = useAuth();
  const actions = useActions();
  const snackbar = useSnackbar();
  const [busy, setBusy] = useState(false);
  const iosNeedsInstall = isIos() && !isStandalone();

  const togglePush = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        const token = await enablePush();
        await actions.saveFcmToken(token);
        actions.updateSettings({ notificationsEnabled: true });
        snackbar.show({ message: 'Notifications activées' });
      } else {
        const token = await disablePush();
        if (token) await actions.deleteFcmToken(token).catch(() => undefined);
        actions.updateSettings({ notificationsEnabled: false });
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      snackbar.show({ message: PUSH_ERRORS[code] ?? 'Impossible d’activer les notifications.' });
    } finally {
      setBusy(false);
    }
  };

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

      <Overline>Notifications</Overline>
      <Card className={styles.card}>
        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Notifications push</span>
            <span className={styles.rowHint}>Le matin : la liste du jour. Le soir : le bilan.</span>
          </span>
          <Switch
            checked={settings.notificationsEnabled}
            label="Notifications push"
            onChange={(v) => !busy && togglePush(v)}
          />
        </div>
        <label className={styles.row}>
          <span className={styles.rowTitle}>Matin</span>
          <input
            type="time"
            className={`${inputClass} ${styles.time}`}
            value={settings.morningNotifTime}
            onChange={(e) =>
              e.target.value && actions.updateSettings({ morningNotifTime: e.target.value })
            }
          />
        </label>
        <label className={styles.row}>
          <span className={styles.rowTitle}>Soir</span>
          <input
            type="time"
            className={`${inputClass} ${styles.time}`}
            value={settings.eveningNotifTime}
            onChange={(e) =>
              e.target.value && actions.updateSettings({ eveningNotifTime: e.target.value })
            }
          />
        </label>
        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Message « Journée bouclée »</span>
            <span className={styles.rowHint}>Le soir, quand tout est fait.</span>
          </span>
          <Switch
            checked={settings.eveningCongratsEnabled}
            label="Message de félicitation"
            onChange={(v) => actions.updateSettings({ eveningCongratsEnabled: v })}
          />
        </div>
        <p className={styles.note}>
          Sur iPhone et iPad (iOS 16.4 ou plus), les notifications ne fonctionnent que si Listo est
          installée sur l’écran d’accueil : Partager → « Sur l’écran d’accueil ».
          {iosNeedsInstall && <strong> Listo n’est pas encore installée sur cet appareil.</strong>}
        </p>
      </Card>

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
