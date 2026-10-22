import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { newId } from '../../domain/ids';
import { relativeDayLabel } from '../../domain/preparations';
import type { Priority, PrepStep } from '../../domain/types';
import {
  BackLink,
  Button,
  Empty,
  Icon,
  Overline,
  Screen,
  ScreenHeader,
  TextInput,
  inputClass,
  useSnackbar,
} from '../../ui';
import { move } from '../lists/reorder';
import styles from '../lists/editor.module.css';

const OFFSET_CHOICES = Array.from({ length: 15 }, (_, i) => i - 14);

export function TemplateEditorScreen() {
  const { id } = useParams();
  const { templates, lists, ready } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const template = templates.find((t) => t.id === id);
  const [name, setName] = useState<string | null>(null);
  const [steps, setSteps] = useState<PrepStep[] | null>(null);

  useEffect(() => {
    if (template && steps === null) {
      setName(template.name);
      setSteps(template.steps);
    }
  }, [template, steps]);

  if (!template || steps === null || name === null) {
    return (
      <Screen noNav>
        <BackLink to="/modeles" label="Modèles" />
        <Empty>{ready ? 'Modèle introuvable.' : 'Chargement…'}</Empty>
      </Screen>
    );
  }

  const update = (i: number, patch: Partial<PrepStep>) =>
    setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStep = () =>
    setSteps([
      ...steps,
      {
        id: newId(),
        title: '',
        offsetDays: -1,
        timeHint: null,
        priority: 2,
        estimateMin: null,
        listId: null,
      },
    ]);

  return (
    <Screen noNav>
      <BackLink to="/modeles" label="Modèles" />
      <ScreenHeader title="Modifier le modèle" />
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          actions.updateTemplate(template.id, {
            name: name.trim() || template.name,
            steps: steps
              .filter((s) => s.title.trim())
              .map((s) => ({ ...s, title: s.title.trim() })),
          });
          snackbar.show({ message: 'Modèle enregistré' });
          navigate('/modeles');
        }}
      >
        <TextInput label="Nom du modèle" value={name} onChange={(e) => setName(e.target.value)} />
        <Overline aside={String(steps.length)}>Étapes</Overline>
        <ul className={styles.items}>
          {steps.map((s, i) => (
            <li key={s.id} className={styles.item}>
              <div className={styles.line}>
                <input
                  className={inputClass}
                  aria-label="Étape"
                  placeholder="Étape"
                  value={s.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <span className={styles.tools}>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => setSteps(move(steps, i, -1))}
                  >
                    <Icon name="arrowUp" size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Descendre"
                    disabled={i === steps.length - 1}
                    onClick={() => setSteps(move(steps, i, 1))}
                  >
                    <Icon name="arrowDown" size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Supprimer l’étape"
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </div>
              <div className={styles.small}>
                <select
                  aria-label="Jour"
                  className={inputClass}
                  value={s.offsetDays}
                  onChange={(e) => update(i, { offsetDays: Number(e.target.value) })}
                >
                  {OFFSET_CHOICES.map((o) => (
                    <option key={o} value={o}>
                      {relativeDayLabel(o)}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  aria-label="Heure indicative"
                  className={inputClass}
                  value={s.timeHint ?? ''}
                  onChange={(e) => update(i, { timeHint: e.target.value || null })}
                />
                <select
                  aria-label="Priorité"
                  className={inputClass}
                  value={s.priority}
                  onChange={(e) => update(i, { priority: Number(e.target.value) as Priority })}
                >
                  <option value={1}>P1</option>
                  <option value={2}>P2</option>
                  <option value={3}>P3</option>
                </select>
                <input
                  type="number"
                  min={0}
                  aria-label="Durée en minutes"
                  placeholder="min"
                  className={`${inputClass} ${styles.minutes}`}
                  value={s.estimateMin ?? ''}
                  onChange={(e) =>
                    update(i, { estimateMin: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <select
                  aria-label="Liste attachée"
                  className={inputClass}
                  value={s.listId ?? ''}
                  onChange={(e) => update(i, { listId: e.target.value || null })}
                >
                  <option value="">Sans liste</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="secondary" onClick={addStep}>
          <Icon name="plus" size={18} /> Ajouter une étape
        </Button>
        <div className={styles.footer}>
          <Button type="submit" size="lg" block>
            Enregistrer
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Supprimer le modèle « ${template.name} » ?`)) {
                actions.deleteTemplate(template.id);
                navigate('/modeles');
              }
            }}
          >
            Supprimer le modèle
          </Button>
        </div>
      </form>
    </Screen>
  );
}
