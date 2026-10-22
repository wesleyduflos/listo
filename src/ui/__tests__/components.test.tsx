import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../Checkbox';
import { PriorityChip } from '../PriorityChip';
import { ProgressRing } from '../ProgressRing';
import { SegmentedControl } from '../SegmentedControl';
import { ChecklistGrid } from '../../features/lists/ChecklistGrid';
import { parseItem } from '../../features/lists/parseItem';

describe('Checkbox', () => {
  it('is an accessible checkbox that toggles and vibrates on check', () => {
    const onChange = vi.fn();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<Checkbox checked={false} onChange={onChange} label="Terminer « Lessive »" />);
    const box = screen.getByRole('checkbox', { name: 'Terminer « Lessive »' });
    expect(box).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});

describe('PriorityChip', () => {
  it('labels the priority', () => {
    render(<PriorityChip priority={1} />);
    expect(screen.getByLabelText('Priorité 1')).toHaveTextContent('P1');
  });
});

describe('ProgressRing', () => {
  it('shows done/total and the completed caption', () => {
    const { rerender } = render(<ProgressRing value={3} total={8} doneCaption="Journée bouclée" />);
    expect(screen.getByRole('img', { name: '3 tâches sur 8 terminées' })).toBeInTheDocument();
    expect(screen.queryByText('Journée bouclée')).toBeNull();
    rerender(<ProgressRing value={8} total={8} doneCaption="Journée bouclée" />);
    expect(screen.getByText('Journée bouclée')).toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  it('selects an option', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Filtre"
        value="all"
        onChange={onChange}
        options={[
          { value: 'all', label: 'Tout' },
          { value: 'week', label: 'Semaine' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Tout' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Semaine' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});

describe('ChecklistGrid', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({
    id: `i${i}`,
    label: `Article ${i}`,
    done: i < 4,
  }));

  it('collapses after N items and expands', () => {
    render(<ChecklistGrid items={items} onToggle={() => {}} collapseAfter={8} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    fireEvent.click(screen.getByText('+ 4 autres articles'));
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
  });

  it('adds an item with a quantity', () => {
    const onAdd = vi.fn();
    render(<ChecklistGrid items={[]} onToggle={() => {}} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('+ Ajouter un article'));
    fireEvent.change(screen.getByLabelText('Nouvel article'), {
      target: { value: 'Chaussettes x3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onAdd).toHaveBeenCalledWith('Chaussettes', 3);
  });

  it('parses quantities', () => {
    expect(parseItem('T-shirts ×3')).toEqual({ label: 'T-shirts', qty: 3 });
    expect(parseItem('Pull chaud')).toEqual({ label: 'Pull chaud' });
  });
});
