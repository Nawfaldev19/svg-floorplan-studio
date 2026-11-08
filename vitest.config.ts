import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

/** Real key presses for component tests, through Playwright's keyboard. */
const pressKey: BrowserCommand<[key: string]> = async (context, key) => {
  await context.page.keyboard.press(key);
};

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        'src/core/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          // Process the token file, so design-tokens.test.ts can read it with ?raw
          // (Vitest otherwise replaces CSS with an empty module).
          css: { include: [/tokens\.css/] },
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['tests/component/**/*.test.tsx'],
          setupFiles: ['tests/component/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            // Use the full Chromium build in "new headless" mode: the slimmer headless
            // shell does not render frames on some macOS versions.
            provider: playwright({ launchOptions: { channel: 'chromium' } }),
            instances: [{ browser: 'chromium' }],
            // A desktop window, so the editor shows its wide layout; the compact
            // layouts have their own tests that resize the window.
            viewport: { width: 1280, height: 800 },
            commands: { pressKey },
          },
        },
      },
    ],
  },
});
