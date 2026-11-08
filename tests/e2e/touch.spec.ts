import { expect, test, type Page } from '@playwright/test';

// The compact editor on touch screens: drawers, condensed toolbar menus and
// touch gestures. Runs in the `mobile` (phone layout) and `tablet` projects.
// Drags and pinches are synthesized by Chromium itself through the Chrome
// DevTools Protocol, so the page receives real touch input with pointerType
// "touch". Chromium adds its touch slop (about 15 px) to a synthesized drag,
// so distances are checked as ranges.

const canvas = (page: Page) => page.getByRole('application');
const status = (page: Page) => page.getByRole('status');
const toggle = (page: Page, name: 'Outline' | 'Inspector') =>
  page.getByRole('group', { name: 'Panels' }).getByRole('button', { name });

type Point = { x: number; y: number };

async function openEditor(page: Page) {
  await page.goto('/#/editor');
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '51');
}

/** The canvas's zoom and pan, read from the transform of its content layer. */
async function viewport(page: Page) {
  const transform = await canvas(page).locator('> g').getAttribute('transform');
  const match = /translate\((\S+) (\S+)\) scale\((\S+)\)/.exec(transform ?? '');
  const box = await canvas(page).boundingBox();
  if (!match || !box) throw new Error('canvas not rendered');
  return {
    left: box.x,
    top: box.y,
    x: Number(match[1]),
    y: Number(match[2]),
    scale: Number(match[3]),
  };
}

/** Page position of a world point (cm) on the editor canvas. */
async function toPage(page: Page, world: Point): Promise<Point> {
  const vp = await viewport(page);
  return { x: vp.left + vp.x + world.x * vp.scale, y: vp.top + vp.y + world.y * vp.scale };
}

/** Drags one finger from `from` by (dx, dy) screen pixels. */
async function touchDrag(page: Page, from: Point, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', {
    x: from.x,
    y: from.y,
    xDistance: dx,
    yDistance: dy,
    gestureSourceType: 'touch',
    preventFling: true,
    speed: 400,
  });
  await cdp.detach();
}

/** Spreads (factor above 1) or closes two fingers around `centre`. */
async function pinch(page: Page, centre: Point, factor: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizePinchGesture', {
    x: centre.x,
    y: centre.y,
    scaleFactor: factor,
    gestureSourceType: 'touch',
    relativeSpeed: 300,
  });
  await cdp.detach();
}

/** Upper allowance for the touch slop Chromium adds to a synthesized drag. */
const SLOP_PX = 25;

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
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

test('the outline and inspector open as drawers, move focus and close again @mobile @tablet', async ({
  page,
}) => {
  await openEditor(page);
  // The canvas fills the screen; both panels start closed.
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeHidden();

  await toggle(page, 'Outline').tap();
  await expect(toggle(page, 'Outline')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: /^Outline/ })).toBeFocused();
  await expect(page.getByRole('listbox')).toBeVisible();

  // Escape closes the drawer and puts focus back on its toggle.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(toggle(page, 'Outline')).toBeFocused();
  await expect(toggle(page, 'Outline')).toHaveAttribute('aria-expanded', 'false');

  // Opening the other panel replaces the open one; the close button also returns focus.
  await toggle(page, 'Outline').tap();
  await toggle(page, 'Inspector').tap();
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Close inspector' }).tap();
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeHidden();
  await expect(toggle(page, 'Inspector')).toBeFocused();
});

test('a tap selects an item and a one-finger drag moves it, snapped and undoable @mobile @tablet', async ({
  page,
}) => {
  await openEditor(page);
  const corner = await toPage(page, { x: 450, y: 1400 });
  await page.touchscreen.tap(corner.x, corner.y);
  await expect(status(page)).toHaveText('Selected 1 item');

  const { scale } = await viewport(page);
  await touchDrag(page, corner, 40, 30);
  await expect(status(page)).toHaveText(/^Move 1 item\. Reading corner at \d+, \d+ cm\.$/);
  const [x, y] =
    ((await status(page).textContent()) ?? '').match(/\d+/g)?.slice(1).map(Number) ?? [];
  // The centre moved right and down by the drag (plus slop) and landed on the 10 cm grid.
  expect(x).toBeGreaterThanOrEqual(450 + 40 / scale - 10);
  expect(x).toBeLessThanOrEqual(450 + (40 + SLOP_PX) / scale + 10);
  expect(y).toBeGreaterThanOrEqual(1400 + 30 / scale - 10);
  expect((x ?? 1) % 10).toBe(0);
  expect((y ?? 1) % 10).toBe(0);

  await toggle(page, 'Inspector').tap();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Reading corner',
  );
  await expect(page.getByRole('textbox', { name: 'X' })).toHaveValue(String(x));
  await page.getByRole('button', { name: 'Undo' }).tap();
  await expect(page.getByRole('textbox', { name: 'X' })).toHaveValue('450');
});

test('one finger on empty space pans and two fingers pinch to zoom @mobile @tablet', async ({
  page,
}) => {
  await openEditor(page);
  // Empty canvas just above the plan's north wall.
  const empty = await toPage(page, { x: 1000, y: -300 });
  const before = await viewport(page);
  await touchDrag(page, empty, 50, 20);
  const panned = await viewport(page);
  // The plan follows the finger, and nothing is selected or moved.
  expect(panned.x - before.x).toBeGreaterThanOrEqual(50);
  expect(panned.x - before.x).toBeLessThanOrEqual(50 + SLOP_PX);
  expect(panned.y - before.y).toBeGreaterThanOrEqual(20);
  expect(panned.scale).toBe(before.scale);
  await expect(status(page)).not.toHaveText(/^(Move|Selected)/);

  // Spread two fingers to twice their distance: the plan zooms in about twofold.
  const centre = await toPage(page, { x: 1050, y: 1100 });
  await pinch(page, centre, 2);
  const pinched = await viewport(page);
  expect(pinched.scale / panned.scale).toBeGreaterThan(1.8);
  expect(pinched.scale / panned.scale).toBeLessThan(3);
  await expect(status(page)).not.toHaveText(/^(Move|Selected)/);
});

test('the condensed toolbar reaches every tool through its menus @mobile @tablet', async ({
  page,
}) => {
  await openEditor(page);
  const toolbar = page.getByRole('toolbar', { name: 'Editor tools' });

  // Touch screens get 44 px targets on the toolbar and the panel bar.
  for (const button of await page.locator('[role="toolbar"] button, footer button').all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }

  await toolbar.getByRole('button', { name: 'Add' }).tap();
  const addMenu = page.getByRole('menu', { name: 'Add' });
  await expect(addMenu.getByRole('menuitem', { name: 'Desk' })).toBeFocused();
  await addMenu.getByRole('menuitem', { name: 'Desk' }).tap();
  await expect(addMenu).toBeHidden();
  await expect(status(page)).toHaveText('Added Desk 31');

  const more = toolbar.getByRole('button', { name: 'More tools' });
  await more.tap();
  const menu = page.getByRole('menu', { name: 'More tools' });
  await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Export' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();

  await more.tap();
  await menu.getByRole('menuitem', { name: 'Keyboard shortcuts' }).tap();
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: 'Close' }).tap();
  await expect(more).toBeFocused();

  await more.tap();
  await menu.getByRole('menuitem', { name: 'Load blank floor…' }).tap();
  await page.getByRole('button', { name: 'Replace plan' }).tap();
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '0');
});

test('a swipe on the outline scrolls it without selecting anything @mobile', async ({ page }) => {
  await openEditor(page);
  await toggle(page, 'Outline').tap();
  const list = page.getByRole('listbox');
  const box = await list.boundingBox();
  if (!box) throw new Error('outline not shown');
  await touchDrag(page, { x: box.x + box.width / 2, y: box.y + box.height - 30 }, 0, -200);
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(0);
  // A tap still picks an option.
  await list.getByRole('option').nth(3).tap();
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(1);
});

test('Fit selection keeps the item clear of the zoom controls and the open sheet @mobile', async ({
  page,
}) => {
  await openEditor(page);
  const desk = await toPage(page, { x: 1735, y: 795 });
  await page.touchscreen.tap(desk.x, desk.y);
  await expect(status(page)).toHaveText('Selected 4 items');
  await toggle(page, 'Inspector').tap();
  await page.getByRole('button', { name: 'Fit selection' }).tap();
  const zoomBar = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
  const sheet = await page.getByRole('complementary', { name: 'Item details' }).boundingBox();
  const selection = await canvas(page).locator('g[data-outlines]').boundingBox();
  if (!zoomBar || !sheet || !selection) throw new Error('layout not rendered');
  expect(selection.y + selection.height).toBeLessThanOrEqual(zoomBar.y);
  expect(selection.y + selection.height).toBeLessThanOrEqual(sheet.y);
});

test('the viewer lets a vertical swipe scroll the page and pinches to zoom @mobile', async ({
  page,
}) => {
  await page.goto('/#/viewer');
  const plan = page.getByRole('group', { name: /plan\. Arrow keys/ });
  await expect(plan).toHaveAttribute('data-rendered-items', /\d+/);
  const box = await plan.boundingBox();
  if (!box) throw new Error('viewer not rendered');
  await touchDrag(page, { x: box.x + box.width / 2, y: box.y + box.height * 0.7 }, 0, -250);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);

  const scale = async () => {
    const transform = (await plan.locator('> g').getAttribute('transform')) ?? '';
    return Number(/scale\((\S+)\)/.exec(transform)?.[1]);
  };
  const before = await scale();
  const now = await plan.boundingBox();
  if (!now) throw new Error('viewer not rendered');
  await pinch(page, { x: now.x + now.width / 2, y: now.y + now.height / 2 }, 2);
  await expect.poll(scale).toBeGreaterThan(before * 1.5);
  // Once zoomed, one finger pans the plan instead of the page.
  await expect(plan).not.toHaveAttribute('data-fitted');
});
