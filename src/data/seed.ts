import type { ListItem, PrepStep } from '../domain/types';

/** First-launch content (§9 Phase 4): editable and deletable like any other data. */
export const SEED_LIST: { name: string; items: Omit<ListItem, 'id'>[] } = {
  name: 'Valise week-end',
  items: [
    { label: 'T-shirts', qty: 3 },
    { label: 'Trousse de toilette' },
    { label: 'Chargeur' },
    { label: 'Lunettes de soleil' },
    { label: 'Pantalon' },
    { label: 'Pull chaud' },
    { label: 'Coupe-vent' },
    { label: 'Chaussures marche' },
    { label: 'Sous-vêtements', qty: 3 },
    { label: 'Chaussettes', qty: 3 },
    { label: 'Pyjama' },
    { label: 'Médicaments' },
  ],
};

export const SEED_TEMPLATE: {
  name: string;
  steps: Omit<PrepStep, 'id' | 'listId'>[];
  listStepIndex: number;
} = {
  name: 'Départ week-end',
  listStepIndex: 5,
  steps: [
    { title: "Réserver l'hôtel", offsetDays: -2, timeHint: null, priority: 1, estimateMin: 15 },
    { title: 'Vérifier la météo', offsetDays: -2, timeHint: null, priority: 3, estimateMin: 5 },
    { title: 'Lessive', offsetDays: -1, timeHint: null, priority: 2, estimateMin: 15 },
    { title: 'Billets imprimés', offsetDays: -1, timeHint: null, priority: 2, estimateMin: 5 },
    { title: 'Appareil photo chargé', offsetDays: -1, timeHint: null, priority: 3, estimateMin: 5 },
    { title: 'Faire la valise', offsetDays: -1, timeHint: null, priority: 1, estimateMin: 25 },
    {
      title: 'Vider le lave-vaisselle',
      offsetDays: -1,
      timeHint: null,
      priority: 2,
      estimateMin: 10,
    },
    { title: 'Sortir les poubelles', offsetDays: 0, timeHint: null, priority: 2, estimateMin: 5 },
    { title: 'Fermer les volets', offsetDays: 0, timeHint: null, priority: 2, estimateMin: 5 },
  ],
};
