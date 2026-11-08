// Light, dark or system theme, applied as data-theme on <html> and remembered per browser.
import { useCallback, useEffect, useState } from 'react';

/** The theme the user picked; `system` follows `prefers-color-scheme`. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'floorplan-studio.theme';
const ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Follows the OS setting by default; a manual choice is stored per browser.
 *
 * @returns The current choice and `cycle`, which steps system → light → dark.
 * @remarks
 * Only the values `light` and `dark` are read back from storage; anything else
 * (including a tampered value) means `system`.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === 'system') window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, choice);
    } catch {
      // Private browsing can block storage; the theme still applies for this visit.
    }
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system');
  }, []);

  return { choice, cycle };
}
