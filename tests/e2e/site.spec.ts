import { expect, test } from '@playwright/test';

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  // Policy violations (CSP, Trusted Types) are reported as console errors.
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
});

test('landing page explains the demo and links into both views @mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Lay out a floor. Share it read-only.',
  );
  await page.getByRole('link', { name: 'Open the viewer' }).click();
  await expect(page).toHaveURL(/#\/viewer$/);
  await expect(page.getByRole('link', { name: 'Viewer' })).toHaveAttribute('aria-current', 'page');
});

test('viewer highlights an amenity and shows item details @mobile', async ({ page }) => {
  await page.goto('/#/viewer');
  await page.getByRole('button', { name: 'Step-free access', exact: true }).click();
  await expect(page.getByText(/items offer “Step-free access”/)).toBeVisible();
  const lounge = page.getByRole('button', { name: /^Garden lounge, lounge/ });
  await lounge.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('definition').first()).toHaveText('Garden lounge');
});

test('viewer shows what the editor saved, even straight after the last edit', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('textbox', { name: 'Plan title' }).fill('Shared level');
  await page.getByRole('textbox', { name: 'Plan title' }).press('Enter');
  // No wait for the 400 ms autosave: leaving the editor writes the pending save.
  await page.getByRole('link', { name: 'Viewer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shared level');
});

test('navigation sets the page title and moves focus to the new view', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Floorplan Studio');
  await page.getByRole('link', { name: 'Editor', exact: true }).click();
  await expect(page).toHaveTitle('Editor · Floorplan Studio');
  await expect(page.locator('main')).toBeFocused();
});

test('runs under the strict Content Security Policy without violations', async ({
  page,
  baseURL,
}) => {
  const problems: string[] = [];
  const offOrigin: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error')
      problems.push(`${message.text()} @ ${JSON.stringify(message.location())}`);
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'blob:' && url.origin !== new URL(baseURL ?? '').origin) {
      offOrigin.push(request.url());
    }
  });
  const response = await page.request.get('/');
  expect(response.headers()['content-security-policy']).toContain("style-src 'self'");
  expect(response.headers()['content-security-policy']).toContain("connect-src 'none'");
  await page.goto('/#/editor');
  await page.reload();
  await expect(page.getByRole('application')).toHaveAttribute('data-rendered-items', '51');
  await page.getByRole('link', { name: 'Viewer' }).click();
  await page.getByRole('button', { name: 'Quiet area', exact: true }).click();
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(problems).toEqual([]);
  // The app makes no network calls of its own: every request stays on this origin.
  expect(offOrigin).toEqual([]);
});

test('sends the security headers, and the built page carries the policy as well', async ({
  page,
}) => {
  const html = await page.request.get('/');
  const headers = html.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("require-trusted-types-for 'script'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['cross-origin-resource-policy']).toBe('same-origin');
  expect(headers['permissions-policy']).toContain('camera=()');

  // A static host that cannot send headers still gets the policy from the page itself.
  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]');
  await page.goto('/');
  await expect(meta).toHaveAttribute('content', /script-src 'self'.*trusted-types 'none'/);
  await expect(meta).not.toHaveAttribute('content', /frame-ancestors/);
  // It comes straight after the charset declaration, before any script or style.
  await expect(page.locator('head > :nth-child(2)')).toHaveAttribute(
    'http-equiv',
    'Content-Security-Policy',
  );

  // Scripts are served with nosniff too, not only the page.
  const script = await page.locator('script[type="module"]').getAttribute('src');
  const asset = await page.request.get(script ?? '');
  expect(asset.headers()['x-content-type-options']).toBe('nosniff');
});

test('viewer items stay reachable from the keyboard after zooming in', async ({ page }) => {
  await page.goto('/#/viewer');
  const first = page.getByRole('button', { name: /^Larkspur room, meeting room/ });
  await first.focus();
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('+');
  await page.keyboard.press('End');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('role', 'button');
  await expect(focused).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('definition').first()).not.toHaveText('');
});

test('theme toggle cycles system, light and dark and remembers the choice', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Switch theme/ });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('markup in names is shown as text and never runs', async ({ page }) => {
  const payload = '<img src=x onerror="window.injected=1">';
  await page.evaluate((name) => {
    const item = (id: string) => ({
      id,
      kind: 'desk',
      name,
      x: 100,
      y: 100,
      width: 160,
      height: 80,
      rotation: 0,
      tags: [],
      groupId: null,
    });
    const plan = { schemaVersion: 2, title: name, gridSize: 10, items: [item('a')], groups: [] };
    localStorage.setItem('floorplan-studio.plan', JSON.stringify(plan));
    localStorage.setItem('floorplan-studio.theme', '"><script>window.injected=1</script>');
  }, payload);
  await page.goto('/#/editor');
  await expect(page.getByRole('option', { name: new RegExp(`^${payload}`) })).toBeVisible();
  await page.goto('/#/viewer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(payload);
  expect(await page.locator('main img').count()).toBe(0);
  expect(await page.evaluate(() => (window as { injected?: number }).injected)).toBeUndefined();
  // An unknown stored theme value falls back to following the system setting.
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test('a corrupt saved plan falls back to the demo and is kept as a backup', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('floorplan-studio.plan', '{"schemaVersion":2}');
  });
  await page.goto('/#/viewer');
  await expect(page.getByText('Your saved plan could not be read')).toBeVisible();
  const backup = await page.evaluate(() =>
    localStorage.getItem('floorplan-studio.plan.unreadable'),
  );
  expect(backup).toBe('{"schemaVersion":2}');
});

test('no view scrolls sideways, including open drawers and menus @mobile @tablet', async ({
  page,
}) => {
  const width = page.viewportSize()?.width ?? 0;
  // With a mobile viewport the browser widens the page to fit wide content,
  // so compare with the configured width rather than the window's.
  const pageWidth = () => page.evaluate(() => document.documentElement.scrollWidth);

  await page.goto('/');
  expect(await pageWidth()).toBeLessThanOrEqual(width);

  await page.goto('/#/viewer');
  await page.getByRole('button', { name: 'Step-free access', exact: true }).click();
  expect(await pageWidth()).toBeLessThanOrEqual(width);

  await page.goto('/#/editor');
  await expect(page.getByRole('application')).toHaveAttribute('data-rendered-items', '51');
  expect(await pageWidth()).toBeLessThanOrEqual(width);
  const panels = page.getByRole('group', { name: 'Panels' });
  if (await panels.isVisible()) {
    await panels.getByRole('button', { name: 'Inspector' }).click();
    expect(await pageWidth()).toBeLessThanOrEqual(width);
  }
  const more = page.getByRole('button', { name: 'More tools' });
  if (await more.isVisible()) {
    await more.click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await pageWidth()).toBeLessThanOrEqual(width);
  }
});
