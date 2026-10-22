import { useEffect, useMemo, useState } from 'react';
import { useActions, useData } from '../../data/DataProvider';
import { formatDuration, recurrenceLabel } from '../../domain/format';
import { groupForDate } from '../../domain/horizons';
import { newId } from '../../domain/ids';
import { parseCapture } from '../../domain/parseCapture';
import { checklistFromList } from '../../domain/preparations';
import { formatTz, timeOfDay } from '../../domain/time';
import type { ChecklistItem, Horizon, Priority, Recurrence } from '../../domain/types';
import { BottomSheet, Button, ChoiceChips, Icon, Select, cx, useSnackbar } from '../../ui';
import { ChecklistGrid } from '../lists/ChecklistGrid';
import {
  DueFields,
  DurationField,
  HORIZON_LABEL,
  HORIZON_OPTIONS,
  PRIORITY_OPTIONS,
  RecurrenceEditor,
} from '../tasks/fields';
import styles from './CaptureSheet.module.css';

type Panel =
  'date' | 'priority' | 'duration' | 'horizon' | 'checklist' | 'recurrence' | 'prep' | null;

interface Overrides {
  due?: { dueAt: Date | null; dueHasTime: boolean };
  priority?: Priority;
  estimateMin?: number | null;
  horizon?: Horizon;
}

const DEBOUNCE_MS = 150;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <CaptureForm onClose={onClose} /> : null;
}

function CaptureForm({ onClose }: { onClose: () => void }) {
  const { settings, lists, preparations } = useData();
  const actions = useActions();
  const snackbar = useSnackbar();
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [over, setOver] = useState<Overrides>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [sourceListId, setSourceListId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>(null);
  const [prepId, setPrepId] = useState<string | null>(null);
  const debounced = useDebounced(text, DEBOUNCE_MS);
  const now = useMemo(() => new Date(), []);
  const parsed = useMemo(() => parseCapture(debounced, new Date()), [debounced]);

  const due = over.due ?? { dueAt: parsed.dueAt, dueHasTime: parsed.dueHasTime };
  const priority = over.priority ?? parsed.priority ?? settings.defaultPriority;
  const estimateMin = over.estimateMin !== undefined ? over.estimateMin : parsed.estimateMin;
  const horizon: Horizon = over.horizon ?? parsed.horizon ?? 'week';
  const computedGroup = due.dueAt ? groupForDate(due.dueAt, now) : null;
  const activePreps = preparations.filter((p) => p.status === 'active');
  const title = parsed.title || text.trim();
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const submit = () => {
    const final = parseCapture(text, new Date());
    const finalTitle = final.title || text.trim();
    if (!finalTitle) return;
    const d = over.due ?? { dueAt: final.dueAt, dueHasTime: final.dueHasTime };
    actions.addTask({
      title: finalTitle,
      priority: over.priority ?? final.priority ?? settings.defaultPriority,
      estimateMin: over.estimateMin !== undefined ? over.estimateMin : final.estimateMin,
      dueAt: d.dueAt,
      dueHasTime: d.dueHasTime,
      horizon: d.dueAt ? null : (over.horizon ?? final.horizon ?? 'week'),
      checklist,
      sourceListId,
      recurrence,
      prepId,
    });
    snackbar.show({ message: `« ${finalTitle} » ajoutée` });
    onClose();
  };

  const dueChip = due.dueAt
    ? `${formatTz(due.dueAt, 'EEE d MMM').replace(/^./, (c) => c.toUpperCase())}${due.dueHasTime ? ` · ${timeOfDay(due.dueAt)}` : ''}`
    : 'Sans date';
  const groupLabel: Record<string, string> = {
    today: "aujourd'hui",
    week: 'semaine',
    month: 'mois',
    later: 'plus tard',
  };

  return (
    <BottomSheet open onClose={onClose} label="Nouvelle tâche" title="Nouvelle tâche">
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className={styles.input}
          autoFocus
          enterKeyHint="done"
          aria-label="Nouvelle tâche"
          placeholder="ex. coiffeur samedi p2 15min"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className={styles.understood}>Compris comme :</div>
        <div className={styles.chips}>
          <span className={cx(styles.chip, !title && styles.placeholder)}>{title || 'Titre'}</span>
          <button
            type="button"
            className={cx(styles.chip, !due.dueAt && styles.outline)}
            aria-expanded={panel === 'date'}
            onClick={() => toggle('date')}
          >
            <Icon name="calendar" size={16} />
            {dueChip}
          </button>
          <button
            type="button"
            className={cx(styles.chip, styles.prio, styles[`p${priority}`])}
            aria-expanded={panel === 'priority'}
            aria-label={`Priorité P${priority}`}
            onClick={() => toggle('priority')}
          >
            P{priority}
          </button>
          <button
            type="button"
            className={cx(styles.chip, !estimateMin && styles.outline)}
            aria-expanded={panel === 'duration'}
            onClick={() => toggle('duration')}
          >
            <Icon name="clock" size={16} />
            <span className="mono">{estimateMin ? formatDuration(estimateMin) : 'Durée'}</span>
          </button>
          <button
            type="button"
            className={cx(
              styles.chip,
              (computedGroup || (!over.horizon && !parsed.horizon)) && styles.outline,
            )}
            aria-expanded={panel === 'horizon'}
            onClick={() => toggle('horizon')}
          >
            Horizon :{' '}
            {computedGroup ? groupLabel[computedGroup] : HORIZON_LABEL[horizon].toLowerCase()}
          </button>
        </div>

        {panel === 'date' && (
          <div className={styles.panel}>
            <DueFields
              dueAt={due.dueAt}
              dueHasTime={due.dueHasTime}
              onChange={(v) => setOver((o) => ({ ...o, due: v }))}
            />
          </div>
        )}
        {panel === 'priority' && (
          <div className={styles.panel}>
            <ChoiceChips
              label="Priorité"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(p) => setOver((o) => ({ ...o, priority: p }))}
            />
          </div>
        )}
        {panel === 'duration' && (
          <div className={styles.panel}>
            <DurationField
              value={estimateMin}
              onChange={(v) => setOver((o) => ({ ...o, estimateMin: v }))}
            />
          </div>
        )}
        {panel === 'horizon' && (
          <div className={styles.panel}>
            {due.dueAt ? (
              <p className={styles.note}>
                L’horizon est calculé depuis l’échéance.{' '}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() =>
                    setOver((o) => ({ ...o, due: { dueAt: null, dueHasTime: false } }))
                  }
                >
                  Retirer la date
                </button>
              </p>
            ) : (
              <ChoiceChips
                label="Horizon"
                options={HORIZON_OPTIONS}
                value={horizon}
                onChange={(h) => setOver((o) => ({ ...o, horizon: h }))}
              />
            )}
          </div>
        )}

        <div className={styles.options}>
          <button
            type="button"
            className={styles.option}
            aria-expanded={panel === 'checklist'}
            onClick={() => toggle('checklist')}
          >
            <Icon name="list" size={20} />
            <span className={styles.optionLabel}>Sous-tâches ou liste</span>
            <span className={styles.optionValue}>
              {checklist.length
                ? `${checklist.length} élément${checklist.length > 1 ? 's' : ''}`
                : 'Aucune'}
            </span>
          </button>
          {panel === 'checklist' && (
            <div className={styles.panel}>
              <ChecklistGrid
                columns={1}
                items={checklist}
                onToggle={(id) =>
                  setChecklist((c) => c.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
                }
                onAdd={(label, qty) =>
                  setChecklist((c) => [
                    ...c,
                    { id: newId(), label, ...(qty ? { qty } : {}), done: false },
                  ])
                }
                onRemove={(id) => setChecklist((c) => c.filter((i) => i.id !== id))}
              />
              {lists.length > 0 && (
                <Select
                  label="Copier une liste réutilisable"
                  value=""
                  onChange={(e) => {
                    const list = lists.find((l) => l.id === e.target.value);
                    if (!list) return;
                    setChecklist((c) => [...c, ...checklistFromList(list.items, newId)]);
                    setSourceListId(list.id);
                  }}
                >
                  <option value="">Choisir…</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.items.length})
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}
          <button
            type="button"
            className={styles.option}
            aria-expanded={panel === 'recurrence'}
            onClick={() => toggle('recurrence')}
          >
            <Icon name="repeat" size={20} />
            <span className={styles.optionLabel}>Récurrence</span>
            <span className={styles.optionValue}>{recurrenceLabel(recurrence) ?? 'Aucune'}</span>
          </button>
          {panel === 'recurrence' && (
            <div className={styles.panel}>
              <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
            </div>
          )}
          <button
            type="button"
            className={styles.option}
            aria-expanded={panel === 'prep'}
            onClick={() => toggle('prep')}
          >
            <Icon name="squareCheck" size={20} />
            <span className={styles.optionLabel}>Rattacher à une préparation</span>
            <span className={styles.optionValue}>
              {activePreps.find((p) => p.id === prepId)?.name ?? '—'}
            </span>
          </button>
          {panel === 'prep' && (
            <div className={styles.panel}>
              {activePreps.length ? (
                <ChoiceChips
                  label="Préparation"
                  options={[
                    { value: '', label: 'Aucune' },
                    ...activePreps.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  value={prepId ?? ''}
                  onChange={(v) => setPrepId(v || null)}
                />
              ) : (
                <p className={styles.note}>Aucune préparation en cours.</p>
              )}
            </div>
          )}
        </div>

        <Button type="submit" size="lg" block disabled={!text.trim()}>
          Ajouter
        </Button>
      </form>
    </BottomSheet>
  );
}
