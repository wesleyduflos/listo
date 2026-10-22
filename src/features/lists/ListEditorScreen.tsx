import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { newId } from '../../domain/ids';
import type { ListItem } from '../../domain/types';
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
import { parseItem } from './parseItem';
import { move } from './reorder';
import styles from './editor.module.css';

export function ListEditorScreen() {
  const { id } = useParams();
  const { lists, ready } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const list = lists.find((l) => l.id === id);
  const [name, setName] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (list && items === null) {
      setName(list.name);
      setItems(list.items);
    }
  }, [list, items]);

  if (!list || items === null || name === null) {
    return (
      <Screen noNav>
        <BackLink to="/listes" label="Listes" />
        <Empty>{ready ? 'Liste introuvable.' : 'Chargement…'}</Empty>
      </Screen>
    );
  }

  const update = (i: number, patch: Partial<ListItem>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <Screen noNav>
      <BackLink to="/listes" label="Listes" />
      <ScreenHeader title="Modifier la liste" />
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          actions.updateList(list.id, {
            name: name.trim() || list.name,
            items: items
              .filter((i) => i.label.trim())
              .map((i) => ({ id: i.id, label: i.label.trim(), ...(i.qty ? { qty: i.qty } : {}) })),
          });
          snackbar.show({ message: 'Liste enregistrée' });
          navigate('/listes');
        }}
      >
        <TextInput label="Nom de la liste" value={name} onChange={(e) => setName(e.target.value)} />
        <Overline aside={String(items.length)}>Articles</Overline>
        <ul className={styles.items}>
          {items.map((it, i) => (
            <li key={it.id} className={styles.item}>
              <div className={styles.line}>
                <input
                  className={inputClass}
                  aria-label="Article"
                  value={it.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
                <input
                  className={`${inputClass} ${styles.qty}`}
                  type="number"
                  min={0}
                  aria-label="Quantité"
                  placeholder="Qté"
                  value={it.qty ?? ''}
                  onChange={(e) =>
                    update(i, { qty: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
                <span className={styles.tools}>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => setItems(move(items, i, -1))}
                  >
                    <Icon name="arrowUp" size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Descendre"
                    disabled={i === items.length - 1}
                    onClick={() => setItems(move(items, i, 1))}
                  >
                    <Icon name="arrowDown" size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label={`Retirer ${it.label}`}
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className={styles.line}>
          <input
            className={inputClass}
            placeholder="Nouvel article (ex. Chaussettes x3)"
            aria-label="Nouvel article"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!draft.trim()) return;
                setItems([...items, { id: newId(), ...parseItem(draft) }]);
                setDraft('');
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={!draft.trim()}
            onClick={() => {
              setItems([...items, { id: newId(), ...parseItem(draft) }]);
              setDraft('');
            }}
          >
            Ajouter
          </Button>
        </div>
        <div className={styles.footer}>
          <Button type="submit" size="lg" block>
            Enregistrer
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  `Supprimer la liste « ${list.name} » ? Les tâches qui l’ont copiée ne changent pas.`,
                )
              ) {
                actions.deleteList(list.id);
                navigate('/listes');
              }
            }}
          >
            Supprimer la liste
          </Button>
        </div>
      </form>
    </Screen>
  );
}
