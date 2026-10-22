import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { formatCountdown, shortDate } from '../../domain/format';
import { isPrepActive, prepProgress } from '../../domain/preparations';
import { timeOfDay } from '../../domain/time';
import {
  Button,
  Card,
  Empty,
  Icon,
  Overline,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
} from '../../ui';
import { NewPreparationSheet } from './NewPreparationSheet';
import styles from './PreparationsScreen.module.css';

export function PreparationsScreen() {
  const { preparations, tasks, templates, lists } = useData();
  const now = useNow();
  const [creating, setCreating] = useState(false);
  const active = preparations.filter((p) => isPrepActive(p, now));
  const past = preparations.filter((p) => !isPrepActive(p, now)).reverse();

  return (
    <Screen>
      <ScreenHeader title="Préparations" />
      {active.length === 0 && <Empty>Aucune préparation en cours.</Empty>}
      {active.map((p) => {
        const progress = prepProgress(tasks.filter((t) => t.prepId === p.id));
        return (
          <Link key={p.id} to={`/preparations/${p.id}`} className={styles.link}>
            <Card className={styles.card}>
              <div className={styles.head}>
                <div>
                  <div className={styles.name}>{p.name}</div>
                  <div className={styles.meta}>
                    Départ {shortDate(p.departAt)} ·{' '}
                    <span className="mono">{timeOfDay(p.departAt)}</span>
                  </div>
                </div>
                <div className={styles.side}>
                  <span className={styles.countdown}>
                    {formatCountdown(p.departAt.getTime() - now.getTime())}
                  </span>
                  <span className={styles.count}>
                    {progress.done}/{progress.total}
                  </span>
                </div>
              </div>
              <ProgressBar
                value={progress.done}
                total={progress.total}
                label={`Avancement de ${p.name}`}
              />
            </Card>
          </Link>
        );
      })}
      <Button size="lg" block onClick={() => setCreating(true)}>
        <Icon name="plus" size={20} /> Nouvelle préparation
      </Button>
      <Card className={styles.links}>
        <Row icon="copy" label="Modèles" value={templates.length} to="/modeles" />
        <Row icon="luggage" label="Listes réutilisables" value={lists.length} to="/listes" />
      </Card>
      {past.length > 0 && (
        <>
          <Overline>Terminées</Overline>
          <div className={styles.past}>
            {past.map((p) => (
              <Row
                key={p.id}
                label={p.name}
                value={shortDate(p.departAt)}
                to={`/preparations/${p.id}`}
              />
            ))}
          </div>
        </>
      )}
      {creating && <NewPreparationSheet open onClose={() => setCreating(false)} now={now} />}
    </Screen>
  );
}
