import { useState } from 'react';
import type { ChecklistItem } from '../../domain/types';
import { Button, Checkbox, Icon, cx, inputClass } from '../../ui';
import { parseItem } from './parseItem';
import styles from './ChecklistGrid.module.css';

export interface ChecklistGridProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onAdd?: (label: string, qty?: number) => void;
  onRemove?: (id: string) => void;
  /** Collapsed view shows this many items, then "+ N autres articles". */
  collapseAfter?: number;
  columns?: 1 | 2;
}

export function ChecklistGrid({
  items,
  onToggle,
  onAdd,
  onRemove,
  collapseAfter,
  columns = 2,
}: ChecklistGridProps) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const limit = !expanded && collapseAfter ? collapseAfter : Infinity;
  const visible = items.slice(0, limit);
  const hidden = items.length - visible.length;

  const submit = () => {
    const v = draft.trim();
    if (!v || !onAdd) return;
    const { label, qty } = parseItem(v);
    onAdd(label, qty);
    setDraft('');
  };

  return (
    <div className={styles.wrap}>
      {items.length > 0 && (
        <ul className={cx(styles.grid, columns === 1 && styles.single)}>
          {visible.map((it) => (
            <li key={it.id} className={cx(styles.item, it.done && styles.checked)}>
              <Checkbox
                shape="square"
                checked={it.done}
                label={it.label}
                onChange={() => onToggle(it.id)}
              />
              <button
                type="button"
                className={styles.label}
                onClick={() => onToggle(it.id)}
                tabIndex={-1}
              >
                {it.label}
                {it.qty ? <span className={styles.qty}> ×{it.qty}</span> : null}
              </button>
              {onRemove && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Retirer ${it.label}`}
                  onClick={() => onRemove(it.id)}
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && onAdd && (
        <form
          className={styles.add}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            className={inputClass}
            autoFocus
            placeholder="Article (ex. Chaussettes x3)"
            aria-label="Nouvel article"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => !draft && setAdding(false)}
          />
          <Button type="submit" disabled={!draft.trim()}>
            Ajouter
          </Button>
        </form>
      )}
      {(hidden > 0 || (onAdd && !adding) || expanded) && (
        <div className={styles.foot}>
          {hidden > 0 ? (
            <button
              type="button"
              className={cx(styles.link, styles.more)}
              onClick={() => setExpanded(true)}
            >
              + {hidden} autre{hidden > 1 ? 's' : ''} article{hidden > 1 ? 's' : ''}
            </button>
          ) : expanded && collapseAfter && items.length > collapseAfter ? (
            <button
              type="button"
              className={cx(styles.link, styles.more)}
              onClick={() => setExpanded(false)}
            >
              Réduire
            </button>
          ) : (
            <span />
          )}
          {onAdd && !adding && (
            <button type="button" className={styles.link} onClick={() => setAdding(true)}>
              + Ajouter un article
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FinishPrompt({
  onFinish,
  onDismiss,
}: {
  onFinish: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className={styles.prompt} role="status">
      <span>Tout est prêt, terminer la tâche ?</span>
      <span className={styles.promptActions}>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Plus tard
        </Button>
        <Button size="sm" onClick={onFinish}>
          Terminer
        </Button>
      </span>
    </div>
  );
}
