import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { addDaysTz, atTimeTz, formatTz, isoWeekdayTz, makeDateTz } from '../../domain/time';
import { BottomSheet, Button, ChoiceChips, Field, TextInput, inputClass } from '../../ui';
import styles from './NewPreparationSheet.module.css';

function nextFriday(now: Date): Date {
  const delta = (5 - isoWeekdayTz(now) + 7) % 7 || 7;
  return addDaysTz(now, delta);
}

export function NewPreparationSheet({
  open,
  onClose,
  now,
}: {
  open: boolean;
  onClose: () => void;
  now: Date;
}) {
  const { templates, lists } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? '');
  const [name, setName] = useState('');
  const [date, setDate] = useState(formatTz(nextFriday(now), 'yyyy-MM-dd'));
  const [time, setTime] = useState('18:00');

  const template = templates.find((t) => t.id === templateId) ?? null;
  const submit = () => {
    const [y, m, d] = date.split('-').map(Number);
    const departAt = atTimeTz(makeDateTz(y, m, d), time || '18:00');
    const id = actions.createPreparation(
      name.trim() || template?.name || 'Préparation',
      departAt,
      template,
      lists,
    );
    onClose();
    navigate(`/preparations/${id}`);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Nouvelle préparation"
      title="Nouvelle préparation"
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Modèle">
          <ChoiceChips
            label="Modèle"
            options={[
              ...templates.map((t) => ({ value: t.id, label: t.name })),
              { value: '', label: 'Vierge' },
            ]}
            value={templateId}
            onChange={setTemplateId}
          />
        </Field>
        <TextInput
          label="Nom"
          placeholder={template?.name ?? 'Week-end à Étretat'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field label="Départ">
          <div className={styles.inline}>
            <input
              type="date"
              aria-label="Date de départ"
              className={inputClass}
              value={date}
              required
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
        {template && (
          <p className={styles.hint}>
            {template.steps.length} étape{template.steps.length > 1 ? 's' : ''} seront créées à
            rebours du départ.
          </p>
        )}
        <Button type="submit" size="lg" block disabled={!date}>
          Créer la préparation
        </Button>
      </form>
    </BottomSheet>
  );
}
