import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    pressKey: (key: string) => Promise<void>;
  }
}

/**
 * Presses keys one after another with Playwright's keyboard (see `pressKey` in
 * vitest.config.ts), so they reach whatever has focus, as real key presses do.
 * Combinations use Playwright's syntax, for example "Shift+ArrowUp".
 */
export async function press(...keys: string[]): Promise<void> {
  for (const key of keys) await commands.pressKey(key);
}
