import { describe, expect, it } from 'vitest';
import { press } from './keys';
import { render } from 'vitest-browser-react';
import { createDemoPlan } from '../../src/core/seed';
import { CURRENT_SCHEMA_VERSION, type PlanDocument } from '../../src/core/types';
import { ErrorBoundary } from '../../src/shared/ErrorBoundary';
import { EditorHarness } from './EditorHarness';

const smallPlan: PlanDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  title: 'Small floor',
  gridSize: 10,
  groups: [{ id: 'group-1', name: 'Pair' }],
  items: [
    {
      id: 'item-2',
      kind: 'desk',
      name: 'Window desk',
      x: 100,
      y: 100,
      width: 160,
      height: 80,
      rotation: 0,
      tags: [],
      groupId: 'group-1',
    },
    {
      id: 'item-3',
      kind: 'desk',
      name: 'Corner desk',
      x: 300,
      y: 100,
      width: 160,
      height: 80,
      rotation: 0,
      tags: [],
      groupId: 'group-1',
    },
    {
      id: 'item-4',
      kind: 'planter',
      name: 'Fern planter',
      x: 500,
      y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      tags: [],
      groupId: null,
    },
  ],
};

describe('outline panel', () => {
  it('shows every item and selects one exactly on click', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await expect.element(screen.getByRole('listbox').getByRole('option')).toHaveLength(3);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    await expect
      .element(screen.getByRole('option', { name: /Window desk/ }))
      .toHaveAttribute('aria-selected', 'true');
    // Exact selection from the list: the other group member stays unselected.
    await expect
      .element(screen.getByRole('option', { name: /Corner desk/ }))
      .toHaveAttribute('aria-selected', 'false');
    await expect.element(screen.getByRole('heading', { name: 'Item' })).toBeVisible();
  });

  it('adds to the selection with Shift held', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    await screen.getByRole('option', { name: /Fern planter/ }).click({ modifiers: ['Shift'] });
    await expect.element(screen.getByRole('heading', { name: '2 items selected' })).toBeVisible();
  });

  it('builds a multi-selection from the keyboard alone', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    const list = screen.getByRole('listbox');
    list.element().focus();
    await press('Home');
    await expect
      .element(screen.getByRole('option', { name: /Window desk/ }))
      .toHaveAttribute('aria-selected', 'true');
    // Ctrl+Down moves the focus ring without changing the selection.
    await press('Control+ArrowDown', 'Control+ArrowDown');
    await expect
      .element(screen.getByRole('option', { name: /Fern planter/ }))
      .toHaveAttribute('aria-selected', 'false');
    await press('Space');
    await expect.element(screen.getByRole('heading', { name: '2 items selected' })).toBeVisible();
    await expect
      .element(screen.getByRole('option', { name: /Corner desk/ }))
      .toHaveAttribute('aria-selected', 'false');
    // Shift+Up moves and toggles; Shift+Space selects a range.
    await press('Shift+ArrowUp');
    await expect.element(screen.getByRole('heading', { name: '3 items selected' })).toBeVisible();
    await press('Home', 'Shift+End');
    await expect.element(screen.getByRole('heading', { name: '2 items selected' })).toBeVisible();
    await press('Control+ArrowUp', 'Control+ArrowUp', 'Shift+Space');
    await expect.element(screen.getByRole('heading', { name: '3 items selected' })).toBeVisible();
  });

  it('shows an empty state for a blank plan', async () => {
    const screen = await render(<EditorHarness plan={{ ...smallPlan, items: [], groups: [] }} />);
    await expect.element(screen.getByText(/The plan is empty/)).toBeVisible();
  });
});

describe('inspector', () => {
  it('commits a width edit on blur as one undoable step', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Fern planter/ }).click();
    const width = screen.getByRole('textbox', { name: 'Width' });
    await width.fill('120');
    await screen.getByRole('heading', { name: 'Item' }).click();
    await expect.element(width).toHaveValue('120');
    await expect
      .element(screen.getByTestId('history'))
      .toHaveTextContent('Change width of Fern planter');
    await screen.getByRole('button', { name: 'Undo for test' }).click();
    await expect.element(screen.getByRole('textbox', { name: 'Width' })).toHaveValue('60');
  });

  it('enforces the minimum size from the item kind', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    await screen.getByRole('textbox', { name: 'Height' }).fill('5');
    await screen.getByRole('heading', { name: 'Item' }).click();
    await expect.element(screen.getByRole('textbox', { name: 'Height' })).toHaveValue('40');
  });

  it('rejects text that is not a number without changing the plan', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    await screen.getByRole('textbox', { name: 'X' }).fill('twelve');
    await screen.getByRole('heading', { name: 'Item' }).click();
    await expect.element(screen.getByText('Enter a number.')).toBeVisible();
    await expect
      .element(screen.getByRole('textbox', { name: 'X' }))
      .toHaveAttribute('aria-invalid', 'true');
    await expect.element(screen.getByTestId('history')).toBeEmptyDOMElement();
  });

  it('names the unit and the error for assistive technology', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    const x = screen.getByRole('textbox', { name: 'X' });
    await expect.element(x).toHaveAccessibleDescription('cm');
    await x.fill('twelve');
    await press('Enter');
    await expect.element(x).toHaveAccessibleDescription('cm Enter a number.');
  });

  it('commits on Enter and restores the value on Escape', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    const y = screen.getByRole('textbox', { name: 'Y' });
    await y.fill('250');
    await press('Enter');
    await expect
      .element(screen.getByTestId('history'))
      .toHaveTextContent('Change position of Window desk');
    await y.fill('999');
    await press('Escape');
    await expect.element(y).toHaveValue('250');
  });

  it('steps a value with the arrow keys, ten times as far with Shift', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Fern planter/ }).click();
    const rotation = screen.getByRole('textbox', { name: 'Rotation' });
    await rotation.click();
    await press('ArrowUp', 'ArrowUp');
    await expect.element(rotation).toHaveValue('2');
    await press('Shift+ArrowDown');
    await expect.element(rotation).toHaveValue('352');
    await expect.element(rotation).toHaveFocus();
  });

  it('toggles an amenity through its checkbox', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    const quiet = screen.getByRole('checkbox', { name: 'Quiet area' });
    await quiet.click();
    await expect.element(quiet).toBeChecked();
    await expect
      .element(screen.getByTestId('history'))
      .toHaveTextContent('Change amenities of Window desk');
  });

  it('renames and dissolves the group of the selected item', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('option', { name: /Window desk/ }).click();
    await expect.element(screen.getByRole('heading', { name: 'Group of 2' })).toBeVisible();
    await screen.getByRole('textbox', { name: 'Group name' }).fill('Duo');
    await press('Enter');
    await expect.element(screen.getByRole('option', { name: /Corner desk.*Duo/ })).toBeVisible();
    await screen.getByRole('button', { name: 'Ungroup Duo' }).click();
    await expect.element(screen.getByTestId('history')).toMatchTextContent(/Ungroup 1 group$/);
    await expect
      .element(screen.getByRole('button', { name: 'Ungroup Duo' }))
      .not.toBeInTheDocument();
  });

  it('renames the plan when nothing is selected', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('textbox', { name: 'Plan title' }).fill('Level 4');
    await screen.getByRole('heading', { name: 'Plan' }).click();
    await expect.element(screen.getByTestId('title')).toHaveTextContent('Level 4');
  });
});

describe('file menu', () => {
  it('asks before replacing the plan with a preset, and can be cancelled', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('combobox', { name: 'Preset plan' }).selectOptions('Blank floor');
    // Choosing an option changes nothing by itself.
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Load preset' }).click();
    const dialog = screen.getByRole('dialog', { name: 'Replace the current plan?' });
    await expect.element(dialog).toBeVisible();
    // Focus starts on the safe choice.
    const keep = screen.getByRole('button', { name: 'Keep current plan' });
    await expect.element(keep).toHaveFocus();
    await keep.click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('replaces the plan on confirm and the change is undoable', async () => {
    const screen = await render(<EditorHarness plan={smallPlan} />);
    await screen.getByRole('combobox', { name: 'Preset plan' }).selectOptions('Demo floor');
    await screen.getByRole('button', { name: 'Load preset' }).click();
    await screen.getByRole('button', { name: 'Replace plan' }).click();
    await expect
      .element(screen.getByTestId('count'))
      .toHaveTextContent(String(createDemoPlan().items.length));
    await screen.getByRole('button', { name: 'Undo for test' }).click();
    await expect.element(screen.getByTestId('title')).toHaveTextContent('Small floor');
  });
});

describe('error boundary', () => {
  function Broken(): never {
    throw new Error('render failed');
  }

  it('replaces a crashed view with a recovery message', async () => {
    const screen = await render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    await expect.element(screen.getByRole('alert')).toMatchTextContent(/^Something went wrong/);
    await expect.element(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
  });
});
