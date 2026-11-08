import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.getByRole('application');
const status = (page: Page) => page.getByRole('status');

async function openEditor(page: Page) {
  await page.goto('/#/editor');
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '51');
}

/** World centres (cm) of demo-floor items the tests touch, from `createDemoPlan`. */
const WORLD = {
  'Larkspur room': { x: 450, y: 230 },
  'Thistle room': { x: 450, y: 680 },
  'Reading corner': { x: 450, y: 1400 },
  'Clover desk 1': { x: 1735, y: 795 },
} as const;

/** The canvas's current zoom and pan, read from the transform of its content layer. */
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

/** Page position of a world point on the editor canvas. */
async function toPage(page: Page, world: { x: number; y: number }) {
  const vp = await viewport(page);
  return { x: vp.left + vp.x + world.x * vp.scale, y: vp.top + vp.y + world.y * vp.scale };
}

async function itemCentre(page: Page, name: keyof typeof WORLD) {
  return toPage(page, WORLD[name]);
}

const snap = (value: number) => Math.round(value / 10) * 10;

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

test('adds, nudges and deletes an item with the keyboard only', async ({ page }) => {
  await openEditor(page);
  await canvas(page).focus();
  await page.keyboard.press('d');
  await expect(status(page)).toHaveText('Added Desk 31');
  const x = page.getByRole('textbox', { name: 'X' });
  const before = Number(await x.inputValue());
  await page.keyboard.press('Shift+ArrowRight');
  await expect(x).toHaveValue(String(before + 50));
  await page.keyboard.press('Delete');
  await expect(status(page)).toHaveText('Delete 1 item');
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
});

test('drags an item onto the grid, and undo / redo restore it in one step', async ({ page }) => {
  await openEditor(page);
  const { scale } = await viewport(page);
  const start = await itemCentre(page, 'Reading corner');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Drag by 144 × 103 cm: off the grid lines by 4 and 3 cm, well inside a snap
  // step, so the expected position does not depend on how the zoom rounds.
  await page.mouse.move(start.x + 144 * scale, start.y + 103 * scale, { steps: 8 });
  await page.mouse.up();
  // The grabbed item snaps to the 10 cm grid: its centre moved by the drag, rounded.
  const expectedX = snap(450 + 144);
  const expectedY = snap(1400 + 103);
  await expect(status(page)).toHaveText(
    `Move 1 item. Reading corner at ${expectedX}, ${expectedY} cm.`,
  );
  const x = page.getByRole('textbox', { name: 'X' });
  await expect(x).toHaveValue(String(expectedX));
  await expect(page.getByRole('textbox', { name: 'Y' })).toHaveValue(String(expectedY));
  const moved = await x.inputValue();

  await page.keyboard.press('ControlOrMeta+z');
  await expect(status(page)).toHaveText('Undid: Move 1 item');
  await expect(x).toHaveValue('450');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(x).toHaveValue(moved);
});

test('clicking one pod desk selects its whole group; Alt-click selects just one', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Fit plan' }).click();
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Zoom in' }).click();
  const desk = await itemCentre(page, 'Clover desk 1');
  await page.mouse.click(desk.x, desk.y);
  await expect(page.getByRole('heading', { name: '4 items selected' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.down('Alt');
  await page.mouse.click(desk.x, desk.y);
  await page.keyboard.up('Alt');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Clover desk 1',
  );
});

test('marquee-selects items fully inside the dragged box', async ({ page }) => {
  await openEditor(page);
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas missing');
  // Empty floor area in the lower left, around the reading corner.
  const a = await itemCentre(page, 'Reading corner');
  await page.mouse.move(a.x - 80, a.y - 70);
  await page.mouse.down();
  await page.mouse.move(a.x + 80, a.y + 70, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Reading corner',
  );
});

test('the tag brush paints an amenity onto an item as one undo step', async ({ page }) => {
  await openEditor(page);
  await canvas(page).focus();
  await page.keyboard.press('t');
  await expect(page.getByRole('group', { name: /Brush paints/ })).toBeVisible();
  await page.getByRole('radio', { name: /Dual monitor/ }).check();
  const room = await itemCentre(page, 'Thistle room');
  await page.mouse.click(room.x, room.y);
  await expect(status(page)).toHaveText('Tag 1 item');
  await page.keyboard.press('t');
  await page
    .getByRole('listbox')
    .getByRole('option', { name: /Thistle room/ })
    .click();
  await expect(page.getByRole('checkbox', { name: 'Dual monitor' })).toBeChecked();
});

test('the outline listbox drives selection from the keyboard', async ({ page }) => {
  await openEditor(page);
  const list = page.getByRole('listbox');
  await list.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Planter 10');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Planter 9');
  await page.keyboard.press('Home');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('North wall');
});

test('autosaves to the browser and restores after a reload', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('textbox', { name: 'Plan title' }).fill('Level 5');
  await page.getByRole('textbox', { name: 'Plan title' }).press('Enter');
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Plan title' })).toHaveValue('Level 5');
});

test('exports the plan as JSON and imports it back', async ({ page }) => {
  await openEditor(page);
  // Record what the app hands to the browser's download machinery.
  await page.evaluate(() => {
    const record = window as unknown as { exported?: Promise<string>; fileName?: string };
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob) => {
      record.exported = blob.text();
      return createUrl(blob);
    };
    const nativeClick = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'click')?.value as (
      this: HTMLElement,
    ) => void;
    HTMLAnchorElement.prototype.click = function recordName(this: HTMLAnchorElement) {
      record.fileName = this.download;
      nativeClick.call(this);
    };
  });
  await page.getByRole('button', { name: 'Export' }).click();
  const { text, fileName } = await page.evaluate(async () => {
    const record = window as unknown as { exported?: Promise<string>; fileName?: string };
    return { text: (await record.exported) ?? '', fileName: record.fileName };
  });
  expect(fileName).toBe('larkspur-commons-level-2.floorplan-studio.json');
  expect(JSON.parse(text)).toMatchObject({ schemaVersion: 2, title: 'Larkspur Commons, level 2' });

  await page.getByRole('combobox', { name: 'Preset plan' }).selectOption('Blank floor');
  await page.getByRole('button', { name: 'Load preset' }).click();
  await page.getByRole('button', { name: 'Replace plan' }).click();
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '0');

  await page.locator('input[type="file"]').setInputFiles({
    name: fileName ?? 'plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  await page.getByRole('button', { name: 'Replace plan' }).click();
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '51');
});

test('rejects an invalid import and leaves the plan untouched', async ({ page }) => {
  await openEditor(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 2,
        title: 'x',
        gridSize: 10,
        items: [{ id: 'a' }],
        groups: [],
      }),
    ),
  });
  const dialog = page.getByRole('dialog', { name: 'That file could not be imported' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('listitem').first()).toContainText('items.0.kind');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '51');
});

test('renders only visible items on the 3,000-desk stress floor', async ({ page }) => {
  await openEditor(page);
  await page
    .getByRole('combobox', { name: 'Preset plan' })
    .selectOption('Stress floor (3,000 desks)');
  await page.getByRole('button', { name: 'Load preset' }).click();
  await page.getByRole('button', { name: 'Replace plan' }).click();
  await expect(page.getByText('3000 items · 0 selected')).toBeVisible();
  // Zoom in on the canvas centre: far fewer than 3,000 items should be in the DOM.
  await canvas(page).focus();
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('=');
  const rendered = Number(await canvas(page).getAttribute('data-rendered-items'));
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(300);

  // Selecting everything outlines only the members in view.
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.getByText('3000 items · 3000 selected')).toBeVisible();
  const outlines = Number(
    await canvas(page).locator('g[data-outlines]').getAttribute('data-outlines'),
  );
  expect(outlines).toBeGreaterThan(0);
  expect(outlines).toBeLessThanOrEqual(rendered);
  // Zoomed out to the whole floor, the selection is drawn as its group box alone.
  await page.keyboard.press('0');
  await page.getByRole('button', { name: 'Fit selection' }).click();
  await expect(canvas(page).locator('g[data-outlines]')).toHaveAttribute('data-outlines', '0');
});

test('copies, pastes and aligns from the keyboard and the Arrange panel', async ({ page }) => {
  await openEditor(page);
  const list = page.getByRole('listbox');
  await list.getByRole('option', { name: /Larkspur room/ }).click();
  await list.getByRole('option', { name: /Thistle room/ }).click({ modifiers: ['Shift'] });
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+c');
  await expect(status(page)).toHaveText('Copied 2 items');
  await page.keyboard.press('ControlOrMeta+v');
  await expect(status(page)).toHaveText('Paste 2 items');
  await expect(page.getByText('53 items · 2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Align top edges' }).click();
  await expect(status(page)).toHaveText(/^Align top edges of 2 items\. Top-left corner at/);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(status(page)).toHaveText('Undid: Align top edges of 2 items');
});

test('cut then paste puts the item back where it was', async ({ page }) => {
  await openEditor(page);
  await page
    .getByRole('listbox')
    .getByRole('option', { name: /Larkspur room/ })
    .click();
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+x');
  await expect(status(page)).toHaveText('Cut 1 item');
  await expect(page.getByText('50 items · 0 selected')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(page.getByRole('textbox', { name: 'X' })).toHaveValue('450');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Larkspur room',
  );
});

test('resizes from a handle and rotates from the knob, snapped', async ({ page }) => {
  await openEditor(page);
  const corner = await itemCentre(page, 'Reading corner');
  await page.mouse.click(corner.x, corner.y);
  const { scale } = await viewport(page);

  // East handle: the middle of the right edge (the corner is 360 × 260 cm). Drag
  // it 104 cm to the right: halfway between grid lines, so the snapped width
  // (460 cm) does not depend on how the zoom rounds.
  const handle = await toPage(page, { x: 450 + 180, y: 1400 });
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 104 * scale, handle.y, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Width' })).toHaveValue('460');
  await expect(status(page)).toHaveText(/^Resize Reading corner\./);

  // Rotate knob above the item; with Shift, pointing straight right snaps to 90°.
  const width = Number(await page.getByRole('textbox', { name: 'Width' }).inputValue());
  const cx = Number(await page.getByRole('textbox', { name: 'X' }).inputValue());
  const knob = await toPage(page, { x: cx, y: 1400 - 130 - 28 / scale });
  const right = await toPage(page, { x: cx + width, y: 1400 });
  await page.mouse.move(knob.x, knob.y);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(right.x, right.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.getByRole('textbox', { name: 'Rotation' })).toHaveValue('90');
});

test('pans with Space-drag and the middle button, and zooms with Ctrl + wheel', async ({
  page,
}) => {
  await openEditor(page);
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas missing');
  // Empty floor between the meeting rooms and the pods.
  const empty = await toPage(page, { x: 1050, y: 1100 });

  const before = await viewport(page);
  await canvas(page).focus();
  await page.keyboard.down('Space');
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.move(empty.x + 60, empty.y + 20, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const panned = await viewport(page);
  expect(panned.x - before.x).toBeCloseTo(60, 0);
  expect(panned.y - before.y).toBeCloseTo(20, 0);
  await expect(page.getByText('51 items · 0 selected')).toBeVisible();

  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(empty.x - 30, empty.y, { steps: 3 });
  await page.mouse.up({ button: 'middle' });
  expect((await viewport(page)).x - panned.x).toBeCloseTo(-30, 0);

  const readout = page.getByRole('button', { name: /^Zoom \d+%/ });
  const zoomBefore = await readout.textContent();
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await expect(readout).not.toHaveText(zoomBefore ?? '');
});

test('a right-press neither selects nor moves anything', async ({ page }) => {
  await openEditor(page);
  const room = await itemCentre(page, 'Thistle room');
  await page.mouse.move(room.x, room.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(room.x + 40, room.y, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
  await expect(page.getByText('51 items · 0 selected')).toBeVisible();
});

test('clicking one item of a larger selection narrows the selection to it', async ({ page }) => {
  await openEditor(page);
  await canvas(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.getByText('51 items · 51 selected')).toBeVisible();
  const desk = await itemCentre(page, 'Clover desk 1');
  await page.mouse.click(desk.x, desk.y);
  await expect(page.getByRole('heading', { name: '4 items selected' })).toBeVisible();
});

test('a keyboard delete during a drag cancels the drag instead of crashing', async ({ page }) => {
  await openEditor(page);
  const start = await itemCentre(page, 'Reading corner');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y, { steps: 4 });
  await page.keyboard.press('Delete');
  await page.mouse.move(start.x + 60, start.y, { steps: 4 });
  await page.mouse.up();
  await expect(status(page)).toHaveText('Delete 1 item');
  await expect(page.getByText('50 items · 0 selected')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByRole('textbox', { name: 'X' })).toHaveValue('450');
});

test('Escape during a drag drops it and keeps the selection', async ({ page }) => {
  await openEditor(page);
  const start = await itemCentre(page, 'Reading corner');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 40, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.move(start.x + 120, start.y + 40, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByText('51 items · 1 selected')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'X' })).toHaveValue('450');
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-disabled', 'true');
});

test('warns when another tab saves the same plan', async ({ page, context }) => {
  await openEditor(page);
  const other = await context.newPage();
  await other.goto('/#/editor');
  await expect(other.getByRole('application')).toHaveAttribute('data-rendered-items', '51');
  await other.getByRole('button', { name: 'Add planter' }).click();
  await expect(other.getByText('All changes saved')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(
    'Another tab saved this plan; saving here replaces that version.',
  );
  await other.close();
});

test('the skip link moves focus to the content without leaving the editor', async ({ page }) => {
  await openEditor(page);
  // Start from a fresh load, so focus begins at the top of the document.
  await page.reload();
  await expect(canvas(page)).toHaveAttribute('data-rendered-items', '51');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/editor$/);
  await expect(page.locator('main')).toBeFocused();
  await expect(canvas(page)).toBeVisible();
});
