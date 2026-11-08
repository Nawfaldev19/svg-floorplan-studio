import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { press } from './keys';
import { render } from 'vitest-browser-react';
import { readingOrder } from '../../src/core/selection';
import { createDemoPlan } from '../../src/core/seed';
import type { AmenityTag, PlanDocument, PlanItem } from '../../src/core/types';
import { PlanViewer } from '../../src/viewer/PlanViewer';

const plan = createDemoPlan();

function ViewerHost({ shown = plan }: { shown?: PlanDocument }) {
  const [highlight, setHighlight] = useState<AmenityTag | null>(null);
  const [selected, setSelected] = useState<PlanItem | null>(null);
  return (
    <div style={{ width: 900, height: 600 }}>
      <p data-testid="picked">{selected?.name ?? 'none'}</p>
      <PlanViewer
        plan={shown}
        highlight={highlight}
        onHighlightChange={setHighlight}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
    </div>
  );
}

describe('PlanViewer', () => {
  it('renders every item of the demo plan when it fits on screen', async () => {
    const screen = await render(<ViewerHost />);
    const canvas = screen.getByRole('group', { name: /plan\. Arrow keys/ });
    await expect.element(canvas).toHaveAttribute('data-rendered-items', String(plan.items.length));
  });

  it('highlights an amenity and reports how many items match', async () => {
    const screen = await render(<ViewerHost />);
    const quietCount = plan.items.filter((i) => i.tags.includes('quiet')).length;
    const chip = screen.getByRole('button', { name: 'Quiet area' });
    await chip.click();
    await expect.element(chip).toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(screen.getByText(`${quietCount} of ${plan.items.length} items offer “Quiet area”.`))
      .toBeVisible();
    await chip.click();
    await expect.element(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes items as labelled buttons that can be picked', async () => {
    const screen = await render(<ViewerHost />);
    const room = screen.getByRole('button', { name: /^Larkspur room, meeting room/ });
    await expect.element(room).toBeInTheDocument();
    await room.click();
    await expect.element(screen.getByTestId('picked')).toHaveTextContent('Larkspur room');
    await expect.element(room).toHaveAttribute('aria-pressed', 'true');
  });

  it('draws labels as whole words of the accessible name (WCAG 2.5.3)', async () => {
    const screen = await render(<ViewerHost />);
    await expect
      .element(screen.getByRole('button', { name: /^Larkspur room, meeting room/ }))
      .toBeInTheDocument();
    const buttons = [...document.querySelectorAll('g[role="button"]')];
    const labelled = buttons.filter((button) => button.querySelector('text'));
    expect(labelled.length).toBeGreaterThan(0);
    for (const button of labelled) {
      const words = (button.querySelector('text')?.textContent ?? '').replace(/…$/, '').split(' ');
      const nameWords = (button.getAttribute('aria-label') ?? '').replace(/,/g, '').split(' ');
      expect(nameWords.slice(0, words.length)).toEqual(words);
    }
  });

  it('is one Tab stop whose arrow keys reach every item, even zoomed in', async () => {
    const screen = await render(<ViewerHost />);
    const canvas = screen.getByRole('group', { name: /plan\. Arrow keys/ });
    const order = readingOrder(plan.items);
    const first = order[0]!;
    const last = order.at(-1)!;
    const focusable = canvas.element().querySelectorAll('[role="button"][tabindex="0"]');
    expect(focusable).toHaveLength(1);

    (focusable[0] as HTMLElement).focus();
    await expect
      .element(screen.getByRole('button', { name: new RegExp(`^${first.name},`) }))
      .toHaveFocus();
    await press('+', '+', '+', '+', '+', '+');
    const rendered = Number(canvas.element().getAttribute('data-rendered-items'));
    expect(rendered).toBeLessThan(plan.items.length);

    // The last item is off screen at this zoom; moving to it brings it into view.
    await press('End');
    const lastButton = screen.getByRole('button', { name: new RegExp(`^${last.name},`) });
    await expect.element(lastButton).toHaveFocus();
    await press('Enter');
    await expect.element(screen.getByTestId('picked')).toHaveTextContent(last.name);
  });

  it('pans with Shift and the arrow keys', async () => {
    const screen = await render(<ViewerHost />);
    const item = screen.getByRole('button', { name: /^Larkspur room/ });
    await expect.element(item).toBeInTheDocument();
    const layer = screen
      .getByRole('group', { name: /plan\. Arrow keys/ })
      .element()
      .querySelector('g');
    const before = layer?.getAttribute('transform');
    item.element().focus();
    await press('Shift+ArrowRight');
    expect(layer?.getAttribute('transform')).not.toBe(before);
    await expect.element(item).toHaveFocus();
  });

  it('keeps a Tab stop when the host passes a plan without the focused item', async () => {
    const screen = await render(<ViewerHost />);
    const room = screen.getByRole('button', { name: /^Larkspur room, meeting room/ });
    await room.click();
    const without = { ...plan, items: plan.items.filter((i) => !i.name.startsWith('Larkspur')) };
    await screen.rerender(<ViewerHost shown={without} />);
    const canvas = screen.getByRole('group', { name: /plan\. Arrow keys/ }).element();
    const stops = canvas.querySelectorAll('[role="button"][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]?.getAttribute('aria-label')).toMatch(
      new RegExp(`^${readingOrder(without.items)[0]!.name},`),
    );
  });
});
