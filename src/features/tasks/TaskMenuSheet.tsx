import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActions } from '../../data/DataProvider';
import { addDaysTz, endOfDayTz } from '../../domain/time';
import type { Task } from '../../domain/types';
import { BottomSheet, ChoiceChips, Row, useSnackbar } from '../../ui';
import { DateSheet } from './DateSheet';
import { HORIZON_OPTIONS } from './fields';
import styles from './sheets.module.css';

/** Contextual menu of a task (long press / right click). */
export function TaskMenuSheet({
  task,
  onClose,
  now,
}: {
  task: Task | null;
  onClose: () => void;
  now: Date;
}) {
  const actions = useActions();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [picking, setPicking] = useState(false);
  if (!task && !picking) return null;

  const close = () => {
    setPicking(false);
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={!!task && !picking}
        onClose={close}
        label={`Actions pour ${task?.title ?? ''}`}
      >
        {task && (
          <div className={styles.body}>
            <div className={styles.taskTitle}>{task.title}</div>
            {!task.dueAt && (
              <>
                <div className={styles.section}>Horizon</div>
                <ChoiceChips
                  label="Horizon"
                  options={HORIZON_OPTIONS}
                  value={task.horizon}
                  onChange={(h) => {
                    actions.updateTask(task.id, { horizon: h });
                    close();
                  }}
                />
              </>
            )}
            <div className={styles.menu}>
              <Row icon="pencil" label="Modifier" onClick={() => navigate(`/taches/${task.id}`)} />
              <Row
                icon="calendar"
                label="Demain"
                onClick={() => {
                  actions.updateTask(task.id, {
                    dueAt: endOfDayTz(addDaysTz(now, 1)),
                    dueHasTime: false,
                  });
                  close();
                }}
              />
              <Row icon="calendar" label="Choisir une date" onClick={() => setPicking(true)} />
              {task.dueAt && (
                <Row
                  icon="x"
                  label="Retirer l’échéance"
                  onClick={() => {
                    actions.updateTask(task.id, {
                      dueAt: null,
                      dueHasTime: false,
                      horizon: 'week',
                    });
                    close();
                  }}
                />
              )}
              <Row
                icon="archive"
                label="Abandonner"
                onClick={() => {
                  actions.abandonTask(task);
                  snackbar.show({
                    message: `« ${task.title} » abandonnée`,
                    actionLabel: 'Annuler',
                    onAction: () => actions.reopenTask(task),
                  });
                  close();
                }}
              />
            </div>
          </div>
        )}
      </BottomSheet>
      {picking && task && (
        <DateSheet
          open
          now={now}
          initial={task.dueAt ? { dueAt: task.dueAt, dueHasTime: task.dueHasTime } : undefined}
          onClose={close}
          onPick={(v) => actions.updateTask(task.id, v)}
        />
      )}
    </>
  );
}
