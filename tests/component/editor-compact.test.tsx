import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { EditorPage } from '../../src/editor/EditorPage';
import { press } from './keys';

// The phone layout: the window is resized to a phone, so the editor shows its
// condensed toolbar and opens the outline and inspector as drawers.
function Frame() {
  return (
    <div style={{ height: 760, width: 375 }}>
      <EditorPage />
    </div>
  );
}

describe('EditorPage on a phone-sized window', () => {
  beforeEach(async () => {
    localStorage.clear();
    await page.viewport(375, 812);
  });

  it('opens a drawer from the panel bar, focuses its heading and closes it with Escape', async () => {
    const screen = await render(<Frame />);
    const panels = screen.getByRole('group', { name: 'Panels' });
    const outline = panels.getByRole('button', { name: 'Outline' });
    await expect.element(screen.getByRole('listbox')).not.toBeInTheDocument();
    await outline.click();
    await expect.element(outline).toHaveAttribute('aria-expanded', 'true');
    await expect.element(screen.getByRole('heading', { name: /^Outline/ })).toHaveFocus();
    await press('Escape');
    await expect.element(outline).toHaveAttribute('aria-expanded', 'false');
    await expect.element(outline).toHaveFocus();
    // Hidden drawers leave the accessibility tree, so a role query no longer finds the list.
    await expect.element(screen.getByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps Escape for a text field inside the inspector drawer', async () => {
    const screen = await render(<Frame />);
    await screen
      .getByRole('group', { name: 'Panels' })
      .getByRole('button', { name: 'Inspector' })
      .click();
    const title = screen.getByRole('textbox', { name: 'Plan title' });
    await title.fill('Draft title');
    await press('Escape');
    // The field reverts its draft; the drawer stays open.
    await expect.element(title).toHaveValue('Larkspur Commons, level 2');
    await expect.element(title).toBeVisible();
    await screen.getByRole('button', { name: 'Close inspector' }).click();
    await expect.element(title).not.toBeInTheDocument();
  });

  it('moves through the overflow menu with the arrow keys and returns focus on Escape', async () => {
    const screen = await render(<Frame />);
    const more = screen.getByRole('button', { name: 'More tools' });
    more.element().focus();
    await press('ArrowUp');
    const menu = screen.getByRole('menu', { name: 'More tools' });
    await expect.element(menu.getByRole('menuitem', { name: 'Keyboard shortcuts' })).toHaveFocus();
    await press('ArrowDown');
    await expect.element(menu.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();
    await press('End');
    await expect.element(menu.getByRole('menuitem', { name: 'Keyboard shortcuts' })).toHaveFocus();
    await press('Home');
    await expect.element(menu.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();
    // Nothing is selected, so Duplicate is disabled: activating it does nothing.
    await press('Enter');
    await expect.element(menu).toBeVisible();
    await press('Escape');
    await expect.element(menu).not.toBeInTheDocument();
    await expect.element(more).toHaveFocus();
  });

  it('adds an item from the Add menu and skips menu items in the toolbar arrow keys', async () => {
    const screen = await render(<Frame />);
    const add = screen.getByRole('button', { name: 'Add' });
    await add.click();
    await expect
      .element(screen.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Desk' }))
      .toHaveFocus();
    await press('ArrowDown', 'Enter');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Added Meeting room 4');
    await expect.element(add).toHaveFocus();
    // The toolbar's own arrow keys move between its buttons, not into a menu.
    await press('ArrowRight');
    await expect.element(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
  });

  it('opens the shortcut help from the overflow menu and closes the menu on Tab', async () => {
    const screen = await render(<Frame />);
    const more = screen.getByRole('button', { name: 'More tools' });
    await more.click();
    await press('Tab');
    await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    await more.click();
    await screen.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
    await expect.element(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  });
});
