import { useState } from 'react';
import { addDaysTz, endOfDayTz } from '../../domain/time';
import { BottomSheet, Button } from '../../ui';
import { DueFields } from './fields';
import styles from './sheets.module.css';

export function DateSheet({
  open,
  onClose,
  onPick,
  initial,
  now,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (v: { dueAt: Date; dueHasTime: boolean }) => void;
  initial?: { dueAt: Date | null; dueHasTime: boolean };
  now: Date;
}) {
  const [value, setValue] = useState(
    initial ?? { dueAt: endOfDayTz(addDaysTz(now, 1)), dueHasTime: false },
  );
  return (
    <BottomSheet open={open} onClose={onClose} label="Choisir une date" title="Choisir une date">
      <div className={styles.body}>
        <DueFields dueAt={value.dueAt} dueHasTime={value.dueHasTime} onChange={setValue} />
        <Button
          size="lg"
          block
          disabled={!value.dueAt}
          onClick={() => {
            if (value.dueAt) onPick({ dueAt: value.dueAt, dueHasTime: value.dueHasTime });
            onClose();
          }}
        >
          Valider
        </Button>
      </div>
    </BottomSheet>
  );
}
