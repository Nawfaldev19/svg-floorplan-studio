import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { EditorPage } from '../../src/editor/EditorPage';
import { MenuButton } from '../../src/shared/MenuButton';
import { press } from './keys';

// Focus must never fall out of the editor: not when a control becomes
// unavailable, and not when the layout changes under the focused control.
function Frame() {
  return (
    <div style={{ height: 760, width: '100%' }}>
      <EditorPage />
    </div>
  );
}

describe('EditorPage focus', () => {
  beforeEach(async () => {
    localStorage.clear();
    await page.viewport(1280, 800);
  });

  it('keeps focus on Undo when undoing empties the history, and shortcuts keep working', async () => {
    const screen = await render(<Frame />);
    await screen.getByRole('button', { name: 'Add planter' }).click();
    const undo = screen.getByRole('button', { name: 'Undo' });
    undo.element().focus();
    await press('Enter');
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
    await expect.element(undo).toHaveFocus();
    await expect.element(undo).toHaveAttribute('aria-disabled', 'true');
    // Activating it again does nothing; the toolbar arrow keys still move on.
    await press('Enter');
    await expect.element(screen.getByText('51 items · 0 selected')).toBeVisible();
    await press('ArrowRight');
    await expect.element(screen.getByRole('button', { name: 'Redo' })).toHaveFocus();
    await press('Control+Shift+Z');
    await expect.element(screen.getByText('52 items · 1 selected')).toBeVisible();
  });

  it('keeps focus on Delete after deleting, and Backspace on a toolbar button deletes nothing', async () => {
    const screen = await render(<Frame />);
    const outline = screen.getByRole('listbox');
    await outline.getByRole('option', { name: /Larkspur room/ }).click();
    const remove = screen.getByRole('button', { name: 'Delete' });
    remove.element().focus();
    await press('Enter');
    await expect.element(screen.getByText('50 items · 0 selected')).toBeVisible();
    await expect.element(remove).toHaveFocus();

    await outline.getByRole('option', { name: /Thistle room/ }).click();
    screen.getByRole('button', { name: 'Select' }).element().focus();
    await press('Backspace');
    await expect.element(screen.getByText('50 items · 1 selected')).toBeVisible();
    // From the outline, Delete still works.
    outline.element().focus();
    await press('Delete');
    await expect.element(screen.getByText('49 items · 0 selected')).toBeVisible();
  });

  it('turns a burst of arrow presses into one undo step', async () => {
    const screen = await render(<Frame />);
    screen.getByRole('application').element().focus();
    await press('d');
    const x = screen.getByRole('textbox', { name: 'X' });
    const start = Number(x.element().getAttribute('value'));
    await press('ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight');
    await expect.element(x).toHaveValue(String(start + 50));
    await press('Control+z');
    await expect.element(x).toHaveValue(String(start));
    await expect.element(screen.getByRole('status')).toHaveTextContent('Undid: Nudge 1 item');
  });

  it('opens the drawer holding the focused field when the window narrows, and forgets it when it widens', async () => {
    const screen = await render(<Frame />);
    const title = screen.getByRole('textbox', { name: 'Plan title' });
    title.element().focus();
    await page.viewport(800, 1000);
    const inspector = screen
      .getByRole('group', { name: 'Panels' })
      .getByRole('button', { name: 'Inspector' });
    await expect.element(inspector).toHaveAttribute('aria-expanded', 'true');
    await expect.element(title).toHaveFocus();

    // Back on a desktop the sidebar is always shown; narrowing again with focus
    // on the canvas leaves the drawers closed and focus where it is.
    await page.viewport(1280, 800);
    await expect.element(screen.getByRole('group', { name: 'Panels' })).not.toBeInTheDocument();
    const canvas = screen.getByRole('application');
    canvas.element().focus();
    await page.viewport(800, 1000);
    await expect.element(inspector).toHaveAttribute('aria-expanded', 'false');
    await expect.element(canvas).toHaveFocus();
  });

  it('lays out the Arrange tools as two lines of four', async () => {
    const screen = await render(<Frame />);
    screen.getByRole('application').element().focus();
    await press('Control+a');
    const arrange = screen.getByRole('group', { name: 'Arrange' });
    await expect
      .element(arrange.getByRole('button', { name: 'Distribute vertically' }))
      .toBeVisible();
    const tops = [...arrange.element().querySelectorAll('button')]
      .slice(0, 8)
      .map((button) => Math.round(button.getBoundingClientRect().top));
    expect(new Set(tops.slice(0, 4)).size).toBe(1);
    expect(new Set(tops.slice(4)).size).toBe(1);
    expect(tops[4]).toBeGreaterThan(tops[0] ?? 0);
  });
});

describe('MenuButton', () => {
  it('closes when a press lands outside it, even if focus does not move', async () => {
    const screen = await render(
      <div>
        <MenuButton
          label="More"
          icon={null}
          entries={[{ label: 'First', onSelect: () => undefined }]}
        />
        {/* Cancelling mousedown keeps focus where it is, as Safari does for buttons. */}
        <p
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          Status text
        </p>
      </div>,
    );
    await screen.getByRole('button', { name: 'More' }).click();
    await expect.element(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    await screen.getByText('Status text').click();
    await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
  });
});
