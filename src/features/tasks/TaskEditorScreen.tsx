import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { newId } from '../../domain/ids';
import { checklistFromList } from '../../domain/preparations';
import type { Task } from '../../domain/types';
import {
  BackLink,
  Button,
  ChoiceChips,
  Empty,
  Overline,
  Screen,
  Select,
  TextArea,
  TextInput,
  useSnackbar,
} from '../../ui';
import { ChecklistGrid } from '../lists/ChecklistGrid';
import {
  DueFields,
  DurationField,
  HORIZON_OPTIONS,
  PRIORITY_OPTIONS,
  RecurrenceEditor,
} from './fields';
import styles from './TaskEditorScreen.module.css';

type Draft = Pick<
  Task,
  | 'title'
  | 'notes'
  | 'priority'
  | 'estimateMin'
  | 'dueAt'
  | 'dueHasTime'
  | 'horizon'
  | 'checklist'
  | 'recurrence'
  | 'prepId'
  | 'sourceListId'
>;

const toDraft = (t: Task): Draft => ({
  title: t.title,
  notes: t.notes,
  priority: t.priority,
  estimateMin: t.estimateMin,
  dueAt: t.dueAt,
  dueHasTime: t.dueHasTime,
  horizon: t.horizon,
  checklist: t.checklist,
  recurrence: t.recurrence,
  prepId: t.prepId,
  sourceListId: t.sourceListId,
});

export function TaskEditorScreen() {
  const { id } = useParams();
  const isNew = id === 'nouvelle';
  const { tasks, lists, preparations, settings, ready } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const task = tasks.find((t) => t.id === id);
  const [draft, setDraft] = useState<Draft | null>(
    isNew
      ? {
          title: '',
          notes: null,
          priority: settings.defaultPriority,
          estimateMin: null,
          dueAt: null,
          dueHasTime: false,
          horizon: 'week',
          checklist: [],
          recurrence: null,
          prepId: null,
          sourceListId: null,
        }
      : task
        ? toDraft(task)
        : null,
  );

  useEffect(() => {
    if (!draft && task) setDraft(toDraft(task));
  }, [task, draft]);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (!draft) {
    return (
      <Screen noNav>
        <BackLink to="/" label="Aujourd'hui" />
        <Empty>{ready ? 'Tâche introuvable.' : 'Chargement…'}</Empty>
      </Screen>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const save = () => {
    const data = {
      ...draft,
      title: draft.title.trim(),
      horizon: draft.dueAt ? null : (draft.horizon ?? 'week'),
    };
    if (!data.title) return;
    if (isNew) actions.addTask(data);
    else actions.updateTask(id!, data);
    back();
  };
  const activePreps = preparations.filter((p) => p.status === 'active' || p.id === draft.prepId);
  const doneCount = draft.checklist.filter((c) => c.done).length;

  return (
    <Screen noNav>
      <button type="button" className={styles.back} onClick={back}>
        ‹ Retour
      </button>
      <h1 className={styles.title}>{isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}</h1>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextInput
          label="Titre"
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          required
          autoFocus={isNew}
        />
        <TextArea
          label="Notes"
          value={draft.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value || null })}
        />
        <div className={styles.group}>
          <span className={styles.label}>Priorité</span>
          <ChoiceChips
            label="Priorité"
            options={PRIORITY_OPTIONS}
            value={draft.priority}
            onChange={(p) => set({ priority: p })}
          />
        </div>
        <DueFields dueAt={draft.dueAt} dueHasTime={draft.dueHasTime} onChange={(v) => set(v)} />
        {!draft.dueAt && (
          <div className={styles.group}>
            <span className={styles.label}>Horizon</span>
            <ChoiceChips
              label="Horizon"
              options={HORIZON_OPTIONS}
              value={draft.horizon ?? 'week'}
              onChange={(h) => set({ horizon: h })}
            />
          </div>
        )}
        <DurationField value={draft.estimateMin} onChange={(v) => set({ estimateMin: v })} />
        <div className={styles.group}>
          <span className={styles.label}>Récurrence</span>
          <RecurrenceEditor value={draft.recurrence} onChange={(r) => set({ recurrence: r })} />
        </div>
        <Select
          label="Préparation"
          value={draft.prepId ?? ''}
          onChange={(e) => set({ prepId: e.target.value || null })}
        >
          <option value="">Aucune</option>
          {activePreps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <Overline
          aside={draft.checklist.length ? `${doneCount}/${draft.checklist.length}` : undefined}
        >
          Sous-tâches
        </Overline>
        <ChecklistGrid
          columns={1}
          items={draft.checklist}
          onToggle={(itemId) =>
            set({
              checklist: draft.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
            })
          }
          onAdd={(label, qty) =>
            set({
              checklist: [
                ...draft.checklist,
                { id: newId(), label, ...(qty ? { qty } : {}), done: false },
              ],
            })
          }
          onRemove={(itemId) => set({ checklist: draft.checklist.filter((c) => c.id !== itemId) })}
        />
        {lists.length > 0 && (
          <Select
            label="Ajouter une liste réutilisable"
            value=""
            onChange={(e) => {
              const list = lists.find((l) => l.id === e.target.value);
              if (list)
                set({
                  checklist: [...draft.checklist, ...checklistFromList(list.items, newId)],
                  sourceListId: list.id,
                });
            }}
          >
            <option value="">Choisir une liste…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.items.length})
              </option>
            ))}
          </Select>
        )}
        {!isNew && task && draft.checklist.length > 0 && (
          <Button
            variant="soft"
            onClick={() => {
              actions.updateTask(task.id, { checklist: draft.checklist });
              const listId = actions.saveChecklistToList({
                ...task,
                checklist: draft.checklist,
                sourceListId: draft.sourceListId,
              });
              set({ sourceListId: listId });
              const name = lists.find((l) => l.id === draft.sourceListId)?.name;
              snackbar.show({
                message: name ? `Liste « ${name} » mise à jour` : 'Nouvelle liste enregistrée',
              });
            }}
          >
            {draft.sourceListId && lists.some((l) => l.id === draft.sourceListId)
              ? 'Enregistrer dans la liste'
              : 'Enregistrer comme liste'}
          </Button>
        )}

        <div className={styles.actions}>
          <Button type="submit" size="lg" block disabled={!draft.title.trim()}>
            Enregistrer
          </Button>
          {!isNew && task && (
            <div className={styles.secondary}>
              {task.status === 'open' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.abandonTask(task);
                    snackbar.show({
                      message: `« ${task.title} » abandonnée`,
                      actionLabel: 'Annuler',
                      onAction: () => actions.reopenTask(task),
                    });
                    back();
                  }}
                >
                  Abandonner
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => actions.reopenTask(task)}>
                  Rouvrir
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('Supprimer définitivement cette tâche ?')) {
                    actions.deleteTask(task.id);
                    back();
                  }
                }}
              >
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </form>
    </Screen>
  );
}
