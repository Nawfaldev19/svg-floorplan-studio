// Subscribes React to a CSS media query, so layout decisions that need JavaScript use the same breakpoints as CSS.
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept up to date as the window changes.
 *
 * @param query - A media query, for example `(min-width: 1024px)`.
 * @returns `true` while the query matches. Without `matchMedia` (outside a
 *   browser) it returns `false`.
 * @remarks
 * Each subscription creates its own `MediaQueryList` and owns its `onchange`
 * property, so several components can follow the same query independently.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.onchange = notify;
      return () => {
        list.onchange = null;
      };
    },
    [query],
  );
  const read = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, read, () => false);
}
