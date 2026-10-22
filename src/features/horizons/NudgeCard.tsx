import type { Task } from '../../domain/types';
import { Button, Card } from '../../ui';
import styles from './NudgeCard.module.css';

/** "Someday" relaunch (§3.11): one card at a time. */
export function NudgeCard({
  task,
  days,
  onRaise,
  onLater,
}: {
  task: Task;
  days: number;
  onRaise: () => void;
  onLater: () => void;
}) {
  return (
    <Card tone="accent" className={styles.card} role="region" aria-label="Suggestion">
      <p className={styles.text}>
        <strong>{task.title}</strong> dort depuis {days} jours. On la passe en « Ce mois-ci » ?
      </p>
      <div className={styles.actions}>
        <Button onClick={onRaise}>Remonter</Button>
        <Button variant="soft" onClick={onLater}>
          Plus tard
        </Button>
      </div>
    </Card>
  );
}
