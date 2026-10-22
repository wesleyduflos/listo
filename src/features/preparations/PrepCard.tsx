import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration, relativeDay } from '../../domain/format';
import { prepProgress } from '../../domain/preparations';
import { calendarDiff, isSameDayTz, timeOfDay } from '../../domain/time';
import type { Preparation, Task } from '../../domain/types';
import { Checkbox, ProgressBar, cx } from '../../ui';
import { useTaskCompletion } from '../tasks/useTaskCompletion';
import styles from './PrepCard.module.css';

/** Dark card on Today for a preparation with steps today or tomorrow (§5.2 item 3). */
export function PrepCard({ prep, tasks, now }: { prep: Preparation; tasks: Task[]; now: Date }) {
  const navigate = useNavigate();
  const { complete, reopen, isLeaving } = useTaskCompletion();
  const progress = prepProgress(tasks);
  const dToDepart = calendarDiff(prep.departAt, now);
  const todaySteps = tasks.filter(
    (t) => t.dueAt && t.status === 'open' && calendarDiff(t.dueAt, now) <= 0,
  );
  const tomorrowSteps = tasks.filter(
    (t) => t.dueAt && t.status === 'open' && calendarDiff(t.dueAt, now) === 1,
  );
  const steps = todaySteps.length ? todaySteps : tomorrowSteps;
  const stepsLabel = todaySteps.length ? null : 'Demain';
  const departLabel = `Départ ${relativeDay(prep.departAt, now)} ${timeOfDay(prep.departAt)}`;

  return (
    <div
      className={styles.card}
      role="link"
      tabIndex={0}
      aria-label={`Préparation ${prep.name}, ${departLabel}, ${progress.done} sur ${progress.total}`}
      onClick={() => navigate(`/preparations/${prep.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/preparations/${prep.id}`);
      }}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.overline}>
            Préparation · {dToDepart === 0 ? 'Jour J' : `J-${dToDepart}`}
          </div>
          <div className={styles.name}>{prep.name}</div>
          <div className={styles.depart}>{departLabel}</div>
        </div>
        <div className={styles.count}>
          {progress.done}/{progress.total}
        </div>
      </div>
      <ProgressBar
        tone="dark"
        value={progress.done}
        total={progress.total}
        label="Avancement de la préparation"
      />
      {steps.length > 0 && (
        <ul className={styles.steps}>
          {stepsLabel && <li className={styles.stepsLabel}>{stepsLabel}</li>}
          {steps.map((t) => {
            const doneItems = t.checklist.filter((c) => c.done).length;
            const meta = [
              t.checklist.length ? `${doneItems}/${t.checklist.length}` : null,
              t.estimateMin ? formatDuration(t.estimateMin) : null,
              t.dueHasTime && !isSameDayTz(t.dueAt!, prep.departAt) ? timeOfDay(t.dueAt!) : null,
            ].filter(Boolean);
            return (
              <li key={t.id} className={cx(styles.step, isLeaving(t.id) && styles.leaving)}>
                <Checkbox
                  tone="dark"
                  checked={isLeaving(t.id)}
                  label={`Terminer « ${t.title} »`}
                  onChange={(v) => (v ? complete(t) : reopen(t))}
                />
                <span className={styles.stepTitle}>{t.title}</span>
                <span className={styles.stepMeta}>
                  {meta.map((m, i) => (
                    <Fragment key={i}>
                      {i > 0 && ' · '}
                      {m}
                    </Fragment>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
