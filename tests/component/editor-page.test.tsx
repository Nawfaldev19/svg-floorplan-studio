import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { press } from './keys';
import { render } from 'vitest-browser-react';
import { STORAGE_KEY } from '../../src/core/storage';
import { EditorPage } from '../../src/editor/EditorPage';

function Frame() {
  return (
    <div style={{ height: 760, width: 1280 }}>
      <EditorPage />
    </div>
  );
}

describe('EditorPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the demo plan and fits it to the canvas', async () => {
    const screen = await render(<Frame />);
    await expect
      .element(screen.getByRole('application'))
      .toHaveAttribute('data-rendered-items', '51');
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
  });

  it('adds an item from the toolbar, then undoes and redoes it', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Add planter' }).click();
    await expect.element(screen.getByText('52 items · 1 selected')).toBeVisible();
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Planter 11');
    await screen.getByRole('button', { name: 'Undo' }).click();
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
    // Redo restores the selection the change left behind, too.
    await screen.getByRole('button', { name: 'Redo' }).click();
    await expect.element(screen.getByText('52 items · 1 selected')).toBeVisible();
  });

  it('groups, ungroups, duplicates and deletes through toolbar buttons', async () => {
    const screen = await render(<Frame />);
    const outline = screen.getByRole('listbox');
    await outline.getByRole('option', { name: /Larkspur room/ }).click();
    await outline.getByRole('option', { name: /Thistle room/ }).click({ modifiers: ['Shift'] });
    await screen.getByRole('button', { name: 'Group', exact: true }).click();
    await expect.element(screen.getByRole('status')).toHaveTextContent('Group 2 items');
    await screen.getByRole('button', { name: 'Ungroup', exact: true }).click();
    await expect.element(screen.getByRole('status')).toHaveTextContent('Ungroup 1 group');
    await screen.getByRole('button', { name: 'Duplicate' }).click();
    await expect.element(screen.getByText('53 items · 2 selected')).toBeVisible();
    await screen.getByRole('button', { name: 'Delete' }).click();
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
  });

  it('switches to the tag brush and shows the palette', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Tag brush' }).click();
    await expect.element(screen.getByRole('group', { name: /Brush paints/ })).toBeVisible();
    await screen.getByRole('radio', { name: /By a window/ }).click();
    await expect.element(screen.getByRole('radio', { name: /By a window/ })).toBeChecked();
    await screen.getByRole('button', { name: 'Select' }).click();
    await expect
      .element(screen.getByRole('group', { name: /Brush paints/ }))
      .not.toBeInTheDocument();
  });

  it('zooms with the zoom controls and resets to 100%', async () => {
    const screen = await render(<Frame />);
    await expect
      .element(screen.getByRole('application'))
      .toHaveAttribute('data-rendered-items', '51');
    const readout = screen.getByRole('button', { name: /^Zoom \d+%/ });
    const before = readout.element().textContent;
    await screen.getByRole('button', { name: 'Zoom in' }).click();
    await expect.element(readout).not.toHaveTextContent(before);
    await readout.click();
    await expect.element(readout).toHaveTextContent('100%');
    await screen.getByRole('button', { name: 'Zoom out' }).click();
    await expect.element(readout).toHaveTextContent('80%');
    await screen.getByRole('button', { name: 'Fit plan' }).click();
    await expect.element(readout).toHaveTextContent(before);
  });

  it('keeps the toolbar to one Tab stop and moves through it with the arrow keys', async () => {
    const screen = await render(<Frame />);
    const select = screen.getByRole('button', { name: 'Select' });
    select.element().focus();
    await press('ArrowRight');
    await expect.element(screen.getByRole('button', { name: 'Tag brush' })).toHaveFocus();
    await press('End');
    await expect.element(screen.getByRole('button', { name: 'Shortcuts' })).toHaveFocus();
    await press('Home');
    await expect.element(select).toHaveFocus();
    await press('Tab');
    await expect.element(screen.getByRole('application')).toHaveFocus();
  });

  it('ignores single-letter shortcuts and arrows unless the canvas has focus', async () => {
    const screen = await render(<Frame />);
    screen.getByRole('button', { name: 'Select' }).element().focus();
    await press('d');
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
    screen.getByRole('application').element().focus();
    await press('d');
    await expect.element(screen.getByText('52 items · 1 selected')).toBeVisible();
  });

  it('lets arrow keys move between brush radios without nudging the selection', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Add planter' }).click();
    const x = screen.getByRole('textbox', { name: 'X' });
    const before = x.element().getAttribute('value');
    await screen.getByRole('button', { name: 'Tag brush' }).click();
    await screen.getByRole('radio', { name: /Standing desk/ }).click();
    await press('ArrowDown');
    await expect.element(screen.getByRole('radio', { name: /Dual monitor/ })).toBeChecked();
    await expect.element(x).toHaveValue(before);
  });

  it('opens the shortcut help from the toolbar and with "?" on the canvas', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Shortcuts' }).click();
    const help = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect.element(help).toBeVisible();
    await expect.element(help.getByText('Copy, cut and paste the selection')).toBeVisible();
    await help.getByRole('button', { name: 'Close' }).click();
    await expect.element(help).not.toBeInTheDocument();
    screen.getByRole('application').element().focus();
    await press('?');
    await expect.element(help).toBeVisible();
  });

  it('leaves the camera alone when an edit changes the plan bounds', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('combobox', { name: 'Preset plan' }).selectOptions('Blank floor');
    await screen.getByRole('button', { name: 'Load preset' }).click();
    await screen.getByRole('button', { name: 'Replace plan' }).click();
    const readout = screen.getByRole('button', { name: /^Zoom \d+%/ });
    await expect.element(readout).toHaveTextContent('100%');
    await screen.getByRole('button', { name: 'Add desk' }).click();
    await expect.element(screen.getByText('1 item · 1 selected')).toBeVisible();
    await expect.element(readout).toHaveTextContent('100%');
  });

  it('writes a pending save at once when the editor unmounts', async () => {
    const screen = await render(<Frame />);
    const title = screen.getByRole('textbox', { name: 'Plan title' });
    await title.fill('Unmounted level');
    await press('Enter');
    await screen.unmount();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"title": "Unmounted level"');
  });

  it('shows and announces a failed save', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Add planter' }).click();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Not saved: quota exceeded');
  });

  it('says so when browser storage cannot be used at all', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied');
    });
    const screen = await render(<Frame />);
    await expect.element(screen.getByText('Not saved (storage unavailable)')).toBeVisible();
    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('Browser storage is unavailable, so changes will not be kept.');
  });
});
