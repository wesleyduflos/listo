import { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { useNow } from '../../data/useNow';
import { formatCountdown, formatDuration, shortDate, shortDay } from '../../domain/format';
import { prepProgress, prepTimeline, relativeDayLabel, stepDue } from '../../domain/preparations';
import { atTimeTz, calendarDiff, formatTz, makeDateTz, timeOfDay } from '../../domain/time';
import type { Preparation, Task } from '../../domain/types';
import {
  BackLink,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  ChoiceChips,
  Empty,
  Field,
  Icon,
  Overline,
  ProgressBar,
  Screen,
  TextInput,
  cx,
  inputClass,
  useSnackbar,
} from '../../ui';
import { ChecklistGrid, FinishPrompt } from '../lists/ChecklistGrid';
import { useTaskCompletion } from '../tasks/useTaskCompletion';
import styles from './PreparationDetailScreen.module.css';

export function PreparationDetailScreen() {
  const { id } = useParams();
  const { preparations, tasks, templates, ready } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const prep = preparations.find((p) => p.id === id);

  if (!prep) {
    return (
      <Screen noNav>
        <BackLink to="/preparations" label="Préparations" />
        <Empty>{ready ? 'Préparation introuvable.' : 'Chargement…'}</Empty>
      </Screen>
    );
  }

  const steps = tasks.filter((t) => t.prepId === prep.id);
  const progress = prepProgress(steps);
  const timeline = prepTimeline(steps, prep.departAt);
  const template = templates.find((t) => t.id === prep.templateId);

  return (
    <Screen noNav>
      <BackLink to="/preparations" label="Préparations" />
      <header className={styles.header}>
        <h1 className={styles.title}>{prep.name}</h1>
        <p className={styles.meta}>
          Départ {shortDate(prep.departAt)} ·{' '}
          <span className="mono">{timeOfDay(prep.departAt)}</span>
          {template && <> · modèle « {template.name} »</>}
        </p>
      </header>

      <div className={styles.tiles}>
        <div className={cx(styles.tile, styles.tileDark)}>
          <span className={styles.tileLabel}>Départ dans</span>
          <span className={styles.tileValue}>
            {formatCountdown(prep.departAt.getTime() - now.getTime())}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Avancement</span>
          <span className={styles.tileValue}>
            {progress.done} / {progress.total}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Reste</span>
          <span className={styles.tileValue}>{formatDuration(progress.remainingMin)}</span>
        </div>
      </div>

      {timeline.length === 0 && <Empty>Aucune étape pour l’instant.</Empty>}
      {timeline.map((day) => {
        const open = day.tasks.filter((t) => t.status === 'open');
        const done = day.tasks.filter((t) => t.status === 'done');
        const isToday = calendarDiff(day.day, now) === 0;
        const label = `${relativeDayLabel(day.offset)} · ${isToday ? "aujourd'hui" : shortDay(day.day)}${
          day.offset === 0
            ? ` — avant ${timeOfDay(prep.departAt)}`
            : open.length === 0
              ? ' — fait'
              : ''
        }`;
        return (
          <section key={day.offset} className={styles.day} aria-label={label}>
            <Overline className={isToday ? styles.todayLabel : undefined}>{label}</Overline>
            {done.length > 0 && (
              <p className={styles.doneLine}>
                <Icon name="check" size={16} strokeWidth={2.2} className={styles.doneIcon} />
                <span>
                  {done.map((t, i) => (
                    <Fragment key={t.id}>
                      {i > 0 && ' · '}
                      <button
                        type="button"
                        className={styles.doneItem}
                        onClick={() => navigate(`/taches/${t.id}`)}
                      >
                        {t.title}
                      </button>
                    </Fragment>
                  ))}
                </span>
              </p>
            )}
            {open.map((t) =>
              t.checklist.length > 0 ? (
                <ChecklistStep key={t.id} task={t} />
              ) : (
                <StepRow key={t.id} task={t} departAt={prep.departAt} />
              ),
            )}
          </section>
        );
      })}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Ajouter une étape
        </Button>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          <Icon name="pencil" size={18} /> Modifier
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            actions.saveAsTemplate(prep, steps);
            snackbar.show({ message: `Modèle « ${prep.name} » enregistré` });
          }}
        >
          <Icon name="copy" size={18} /> Enregistrer comme modèle
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm('Supprimer cette préparation et ses étapes non faites ?')) {
              actions.deletePreparation(prep.id, steps);
              navigate('/preparations');
            }
          }}
        >
          <Icon name="trash" size={18} /> Supprimer
        </Button>
      </div>

      {editing && (
        <EditPreparationSheet prep={prep} steps={steps} onClose={() => setEditing(false)} />
      )}
      {adding && <AddStepSheet prep={prep} onClose={() => setAdding(false)} />}
    </Screen>
  );
}

function StepRow({ task, departAt }: { task: Task; departAt: Date }) {
  const navigate = useNavigate();
  const { complete, reopen, isLeaving } = useTaskCompletion();
  const showTime = task.dueHasTime && task.dueAt!.getTime() !== departAt.getTime();
  return (
    <div className={cx(styles.step, isLeaving(task.id) && styles.leaving)}>
      <Checkbox
        checked={isLeaving(task.id)}
        label={`Terminer « ${task.title} »`}
        onChange={(v) => (v ? complete(task) : reopen(task))}
      />
      <button
        type="button"
        className={styles.stepTitle}
        onClick={() => navigate(`/taches/${task.id}`)}
      >
        {task.title}
      </button>
      <span className={styles.stepMeta}>
        {[
          showTime ? timeOfDay(task.dueAt!) : null,
          task.estimateMin ? formatDuration(task.estimateMin) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </div>
  );
}

function ChecklistStep({ task }: { task: Task }) {
  const actions = useActions();
  const { lists } = useData();
  const navigate = useNavigate();
  const { complete, reopen, isLeaving } = useTaskCompletion();
  const [dismissed, setDismissed] = useState(false);
  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;
  const list = lists.find((l) => l.id === task.sourceListId);
  const allDone = total > 0 && done === total;

  return (
    <Card className={cx(styles.checkCard, isLeaving(task.id) && styles.leaving)}>
      <div className={styles.checkHead}>
        <Checkbox
          checked={isLeaving(task.id)}
          label={`Terminer « ${task.title} »`}
          onChange={(v) => (v ? complete(task) : reopen(task))}
        />
        <button
          type="button"
          className={styles.checkTitleWrap}
          onClick={() => navigate(`/taches/${task.id}`)}
        >
          <span className={styles.checkTitle}>{task.title}</span>
          <span className={styles.checkMeta}>
            {[
              list ? `Liste « ${list.name} »` : null,
              task.estimateMin ? formatDuration(task.estimateMin) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </button>
        <span className={styles.checkCount}>
          {done}/{total}
        </span>
      </div>
      <ProgressBar value={done} total={total} label={`Progression de ${task.title}`} />
      <ChecklistGrid
        items={task.checklist}
        collapseAfter={8}
        onToggle={(itemId) => {
          setDismissed(false);
          actions.toggleChecklistItem(task, itemId);
        }}
        onAdd={(label, qty) => actions.addChecklistItem(task, label, qty)}
      />
      {allDone && !dismissed && (
        <FinishPrompt onFinish={() => complete(task)} onDismiss={() => setDismissed(true)} />
      )}
    </Card>
  );
}

function EditPreparationSheet({
  prep,
  steps,
  onClose,
}: {
  prep: Preparation;
  steps: Task[];
  onClose: () => void;
}) {
  const actions = useActions();
  const [name, setName] = useState(prep.name);
  const [date, setDate] = useState(formatTz(prep.departAt, 'yyyy-MM-dd'));
  const [time, setTime] = useState(timeOfDay(prep.departAt));
  return (
    <BottomSheet
      open
      onClose={onClose}
      label="Modifier la préparation"
      title="Modifier la préparation"
    >
      <form
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          const [y, m, d] = date.split('-').map(Number);
          const departAt = atTimeTz(makeDateTz(y, m, d), time || '18:00');
          actions.updatePreparation(prep, steps, {
            name: name.trim() || prep.name,
            ...(departAt.getTime() !== prep.departAt.getTime() ? { departAt } : {}),
          });
          onClose();
        }}
      >
        <TextInput label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Départ" hint="Les étapes non faites suivent le départ.">
          <div className={styles.inline}>
            <input
              type="date"
              aria-label="Date de départ"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="time"
              aria-label="Heure de départ"
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </Field>
        <Button type="submit" size="lg" block>
          Enregistrer
        </Button>
      </form>
    </BottomSheet>
  );
}

const OFFSETS = [-7, -3, -2, -1, 0].map((o) => ({ value: o, label: relativeDayLabel(o) }));

function AddStepSheet({ prep, onClose }: { prep: Preparation; onClose: () => void }) {
  const actions = useActions();
  const [title, setTitle] = useState('');
  const [offset, setOffset] = useState(-1);
  const [time, setTime] = useState('');
  const [estimate, setEstimate] = useState('');
  return (
    <BottomSheet open onClose={onClose} label="Nouvelle étape" title="Nouvelle étape">
      <form
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          actions.addTask({
            title: title.trim(),
            prepId: prep.id,
            estimateMin: estimate ? Number(estimate) : null,
            ...stepDue({ offsetDays: offset, timeHint: time || null }, prep.departAt),
          });
          onClose();
        }}
      >
        <TextInput
          label="Étape"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />
        <Field label="Jour">
          <ChoiceChips label="Jour" options={OFFSETS} value={offset} onChange={setOffset} />
        </Field>
        <div className={styles.inline}>
          <TextInput
            label="Heure (optionnelle)"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <TextInput
            label="Durée (min)"
            type="number"
            inputMode="numeric"
            min={0}
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" block disabled={!title.trim()}>
          Ajouter l’étape
        </Button>
      </form>
    </BottomSheet>
  );
}
