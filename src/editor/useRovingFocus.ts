// Roving tabindex for the editor toolbar (WAI-ARIA toolbar pattern).
import { useEffect, useRef, type RefObject } from 'react';

const NEXT: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/**
 * The toolbar's controls in order. Controls marked `aria-disabled` stay in
 * the list, so focus never falls out of the toolbar when one is disabled.
 */
function controls(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  // Items of an open menu belong to the menu's own arrow-key handling, not to the toolbar.
  return [...root.querySelectorAll<HTMLElement>('button:not([role="menuitem"]), select')].filter(
    (el) => !(el as HTMLButtonElement | HTMLSelectElement).disabled,
  );
}

/**
 * Roving tabindex for a toolbar (WAI-ARIA toolbar pattern): the toolbar is one
 * Tab stop, arrow keys move between its controls (including ones marked
 * `aria-disabled`), Home and End jump to the ends, and focus comes back to the
 * control that was used last.
 *
 * @param container - The element with `role="toolbar"`.
 * @returns `focused`, to call from the toolbar's `onFocus`, and `keyPressed`,
 *   to call from its `onKeyDown`.
 */
export function useRovingFocus(container: RefObject<HTMLElement | null>) {
  const current = useRef<HTMLElement | null>(null);

  const sync = () => {
    const list = controls(container.current);
    const active = list.find((el) => el === current.current) ?? list[0];
    for (const el of list) el.tabIndex = el === active ? 0 : -1;
  };

  // Controls come and go as the layout changes, so re-sync after every render.
  useEffect(sync);

  return {
    focused(target: unknown) {
      if (target instanceof HTMLElement && controls(container.current).includes(target)) {
        current.current = target;
        sync();
      }
    },
    /** Moves focus for a navigation key. Returns true when the key was used. */
    keyPressed(target: unknown, key: string): boolean {
      const step = NEXT[key];
      if (!step || !(target instanceof HTMLElement)) return false;
      const list = controls(container.current);
      const index = list.indexOf(target);
      if (index < 0) return false;
      list[step(index, list.length)]?.focus();
      return true;
    },
  };
}
