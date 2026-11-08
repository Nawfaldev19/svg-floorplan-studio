import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
      // Drawer and touch tests need a touch screen and a compact layout.
      testIgnore: /touch\.spec\.ts/,
    },
    // A phone (412 × 839, touch): the phone layout with a bottom sheet.
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chromium' }, grep: /@mobile/ },
    // A tablet in portrait (768 × 1024, touch): the tablet layout with a side drawer.
    {
      name: 'tablet',
      use: {
        ...devices['Galaxy Tab S4'],
        viewport: { width: 768, height: 1024 },
        channel: 'chromium',
      },
      grep: /@tablet/,
    },
  ],
  webServer: {
    command: `npm run build && npm run preview`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
