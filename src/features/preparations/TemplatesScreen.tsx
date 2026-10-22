import { useNavigate } from 'react-router-dom';
import { useActions, useData } from '../../data/DataProvider';
import { BackLink, Button, Card, Empty, Icon, Row, Screen, ScreenHeader } from '../../ui';
import styles from '../lists/editor.module.css';

export function TemplatesScreen() {
  const { templates } = useData();
  const actions = useActions();
  const navigate = useNavigate();
  return (
    <Screen noNav>
      <BackLink to="/preparations" label="Préparations" />
      <ScreenHeader title="Modèles" />
      {templates.length === 0 ? (
        <Empty>Aucun modèle.</Empty>
      ) : (
        <Card className={styles.card}>
          {templates.map((t) => (
            <Row
              key={t.id}
              label={t.name}
              value={`${t.steps.length} étape${t.steps.length > 1 ? 's' : ''}`}
              to={`/modeles/${t.id}`}
            />
          ))}
        </Card>
      )}
      <Button
        size="lg"
        block
        onClick={() => navigate(`/modeles/${actions.createTemplate('Nouveau modèle')}`)}
      >
        <Icon name="plus" size={20} /> Nouveau modèle
      </Button>
    </Screen>
  );
}
