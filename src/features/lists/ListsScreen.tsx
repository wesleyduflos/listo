import { useNavigate } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { BackLink, Button, Card, Empty, Icon, Row, Screen, ScreenHeader } from '../../ui';
import styles from './editor.module.css';

export function ListsScreen() {
  const { lists } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  return (
    <Screen noNav>
      <BackLink to="/preparations" label="Préparations" />
      <ScreenHeader title="Listes réutilisables" />
      {lists.length === 0 ? (
        <Empty>Aucune liste.</Empty>
      ) : (
        <Card className={styles.card}>
          {lists.map((l) => (
            <Row
              key={l.id}
              label={l.name}
              value={`${l.items.length} article${l.items.length > 1 ? 's' : ''}`}
              to={`/listes/${l.id}`}
            />
          ))}
        </Card>
      )}
      <Button
        size="lg"
        block
        onClick={() => navigate(`/listes/${actions.createList('Nouvelle liste')}`)}
      >
        <Icon name="plus" size={20} /> Nouvelle liste
      </Button>
    </Screen>
  );
}
