import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLate } from '../../domain/horizons';
import type { Task } from '../../domain/types';
import { Checkbox, PriorityChip, cx } from '../../ui';
import { taskMeta, type MetaContext } from './meta';
import { useTaskCompletion } from './useTaskCompletion';
import styles from './TaskRow.module.css';

export interface TaskRowProps {
  task: Task;
  now: Date;
  context: MetaContext;
  prepName?: string;
  onMenu?: (task: Task) => void;
  plain?: boolean;
  draggable?: boolean;
  hidePriority?: boolean;
}

const LONG_PRESS_MS = 500;

export function TaskRow({
  task,
  now,
  context,
  prepName,
  onMenu,
  plain,
  draggable,
  hidePriority,
}: TaskRowProps) {
  const navigate = useNavigate();
  const { complete, reopen, isLeaving } = useTaskCompletion();
  const [checked, setChecked] = useState(task.status === 'done');
  const [dragging, setDragging] = useState(false);
  const press = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const late = isLate(task, now);
  const leaving = isLeaving(task.id);

  useEffect(() => setChecked(task.status === 'done'), [task.status]);

  const parts = taskMeta(task, now, context, prepName);
  const startPress = () => {
    longPressed.current = false;
    if (!onMenu) return;
    press.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(10);
      onMenu(task);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => window.clearTimeout(press.current);

  return (
    <div
      className={cx(
        styles.row,
        plain && styles.plain,
        late && styles.late,
        task.status === 'done' && styles.done,
        leaving && styles.leaving,
        dragging && styles.dragging,
      )}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/listo-task', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onContextMenu={(e) => {
        if (!onMenu) return;
        e.preventDefault();
        onMenu(task);
      }}
    >
      <Checkbox
        checked={checked}
        tone={late ? 'late' : 'default'}
        label={checked ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
        onChange={(v) => {
          setChecked(v);
          if (v) complete(task);
          else reopen(task);
        }}
      />
      <button
        type="button"
        className={styles.body}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onClick={() => {
          if (longPressed.current) return;
          navigate(`/taches/${task.id}`);
        }}
      >
        <span className={styles.title}>{task.title}</span>
        {parts.length > 0 && (
          <span className={styles.meta}>
            {parts.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && ' · '}
                <span className={p.mono ? styles.mono : undefined}>{p.text}</span>
              </Fragment>
            ))}
          </span>
        )}
      </button>
      {!hidePriority && task.status === 'open' && (
        <span className={styles.aside}>
          <PriorityChip priority={task.priority} />
        </span>
      )}
    </div>
  );
}
