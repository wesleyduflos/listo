import { useId } from 'react';
import type { Recurrence } from '../../domain/types';
import { ChoiceChips, Field, inputClass } from '../../ui';
import { dateValue, fromInputs, timeValue } from './fieldValues';
import styles from './fields.module.css';

export { HORIZON_LABEL, HORIZON_OPTIONS, PRIORITY_OPTIONS } from './fieldValues';

export function DueFields({
  dueAt,
  dueHasTime,
  onChange,
}: {
  dueAt: Date | null;
  dueHasTime: boolean;
  onChange: (v: { dueAt: Date | null; dueHasTime: boolean }) => void;
}) {
  const id = useId();
  const date = dateValue(dueAt);
  const time = timeValue(dueAt, dueHasTime);
  return (
    <Field
      label="Échéance (stricte)"
      htmlFor={`${id}-d`}
      hint={
        dueAt ? undefined : 'Sans échéance, la tâche suit son horizon et n’est jamais en retard.'
      }
    >
      <div className={styles.inline}>
        <input
          id={`${id}-d`}
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => onChange(fromInputs(e.target.value, time))}
        />
        <input
          type="time"
          aria-label="Heure"
          className={inputClass}
          value={time}
          disabled={!date}
          onChange={(e) => onChange(fromInputs(date, e.target.value))}
        />
        {date && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange({ dueAt: null, dueHasTime: false })}
          >
            Effacer
          </button>
        )}
      </div>
    </Field>
  );
}

const DURATIONS = [5, 15, 30, 60];

export function DurationField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const id = useId();
  return (
    <Field label="Durée estimée (min)" htmlFor={id}>
      <div className={styles.inline}>
        <ChoiceChips
          label="Durées rapides"
          options={DURATIONS.map((d) => ({ value: d, label: d < 60 ? `${d}` : '1 h' }))}
          value={value}
          onChange={(v) => onChange(v === value ? null : v)}
        />
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          className={`${inputClass} ${styles.narrow}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Math.max(0, Number(e.target.value)) : null)}
        />
      </div>
    </Field>
  );
}

export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: Recurrence;
  onChange: (r: Recurrence) => void;
}) {
  const mode = value?.mode ?? 'none';
  return (
    <div className={styles.stack}>
      <ChoiceChips
        label="Type de récurrence"
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'fixed', label: 'Fixe' },
          { value: 'flex', label: 'Souple' },
        ]}
        value={mode}
        onChange={(m) =>
          onChange(
            m === 'none'
              ? null
              : m === 'fixed'
                ? { mode: 'fixed', every: 1, unit: 'week' }
                : { mode: 'flex', minDays: 35, maxDays: 42 },
          )
        }
      />
      {value?.mode === 'fixed' && (
        <div className={styles.inline}>
          <span>Tous les</span>
          <input
            type="number"
            min={1}
            aria-label="Intervalle"
            className={`${inputClass} ${styles.narrow}`}
            value={value.every}
            onChange={(e) =>
              onChange({ ...value, every: Math.max(1, Number(e.target.value) || 1) })
            }
          />
          <select
            aria-label="Unité"
            className={`${inputClass} ${styles.unit}`}
            value={value.unit}
            onChange={(e) =>
              onChange({ ...value, unit: e.target.value as 'day' | 'week' | 'month' })
            }
          >
            <option value="day">jours</option>
            <option value="week">semaines</option>
            <option value="month">mois</option>
          </select>
        </div>
      )}
      {value?.mode === 'flex' && (
        <>
          <div className={styles.inline}>
            <span>Entre</span>
            <input
              type="number"
              min={0}
              aria-label="Minimum de jours"
              className={`${inputClass} ${styles.narrow}`}
              value={value.minDays}
              onChange={(e) =>
                onChange({ ...value, minDays: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <span>et</span>
            <input
              type="number"
              min={1}
              aria-label="Maximum de jours"
              className={`${inputClass} ${styles.narrow}`}
              value={value.maxDays}
              onChange={(e) =>
                onChange({ ...value, maxDays: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <span>jours</span>
          </div>
          <p className={styles.hint}>
            Après la réalisation réelle. La suivante est créée à la complétion.
          </p>
        </>
      )}
      {value?.mode === 'fixed' && <p className={styles.hint}>À partir de l’échéance précédente.</p>}
    </div>
  );
}
