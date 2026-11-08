# Audit accessibility with axe-core

An automated audit with [axe-core](https://github.com/dequelabs/axe-core) of the production build, across the page states listed below, in light and dark themes. axe-core is MPL-2.0 licensed and the project keeps to permissive licences, so it is not a dependency: the audit installs it into a throwaway folder outside the repository and nothing is added to `package.json`.

**Last audited 2026-10-18 (axe-core 4.14.0): 0 violations across 32 page states**, which are the 16 states below in each theme. Automated rules catch only part of the possible problems; what else was checked is in [ACCESSIBILITY.md](../../ACCESSIBILITY.md).

| Window                              | States                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Desktop, 1280 × 800                 | overview; editor; editor with an item selected; tag brush; shortcut help; viewer; viewer with a highlight and details |
| Phone, 375 × 812, touch emulation   | editor; outline sheet; inspector sheet; Add menu; More tools menu; viewer                                             |
| Tablet, 768 × 1024, touch emulation | editor; outline drawer; inspector drawer                                                                              |

## 1. Serve the build

In the repository, after `npm ci` and `npx playwright install chromium`:

```bash
npm run build
npm run preview    # http://localhost:4173, with the production headers
```

## 2. Install the audit tools in a temporary folder

In a second terminal. `npm_config_cache` keeps npm's download cache in the same temporary area, so nothing is installed globally. Use the Playwright version from this repository's `package-lock.json`, so the browser installed above is reused.

```bash
export AUDIT_DIR="${TMPDIR:-/tmp}/floorplan-studio-axe"
export npm_config_cache="$AUDIT_DIR/npm-cache"
mkdir -p "$AUDIT_DIR" && cd "$AUDIT_DIR"
npm init -y > /dev/null
npm install --no-audit --no-fund @axe-core/playwright@4.14.0 playwright@1.64.1
```

## 3. Save the audit script

Save this as `audit.mjs` in the same folder. Each state starts from a fresh page with the demo floor. The page's Trusted Types policy would block the injected axe script, so the audit context bypasses the CSP; the end-to-end tests check the policy separately.

```js
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
};
const editor = (p) => p.goto(`${base}/#/editor`);
const panel = (name) => async (p) => {
  await editor(p);
  await p.getByRole('group', { name: 'Panels' }).getByRole('button', { name }).click();
};
const press = (name) => async (p) => {
  await editor(p);
  await p.getByRole('button', { name }).click();
};
const STATES = [
  ['desktop', 'overview', (p) => p.goto(`${base}/#/`)],
  ['desktop', 'editor', editor],
  [
    'desktop',
    'item selected',
    async (p) => {
      await editor(p);
      await p.getByRole('listbox').getByRole('option').first().click();
    },
  ],
  ['desktop', 'tag brush', press('Tag brush')],
  ['desktop', 'shortcut help', press('Shortcuts')],
  ['desktop', 'viewer', (p) => p.goto(`${base}/#/viewer`)],
  [
    'desktop',
    'viewer highlight',
    async (p) => {
      await p.goto(`${base}/#/viewer`);
      await p.getByRole('button', { name: 'Quiet area', exact: true }).click();
      await p.getByRole('button', { name: /^Larkspur room/ }).click();
    },
  ],
  ['phone', 'editor', editor],
  ['phone', 'outline sheet', panel('Outline')],
  ['phone', 'inspector sheet', panel('Inspector')],
  ['phone', 'Add menu', press('Add')],
  ['phone', 'More tools menu', press('More tools')],
  ['phone', 'viewer', (p) => p.goto(`${base}/#/viewer`)],
  ['tablet', 'editor', editor],
  ['tablet', 'outline drawer', panel('Outline')],
  ['tablet', 'inspector drawer', panel('Inspector')],
];

const browser = await chromium.launch({ channel: 'chromium' });
const problems = [];
let audited = 0;
for (const colorScheme of ['light', 'dark']) {
  for (const [size, name, reach] of STATES) {
    const context = await browser.newContext({ ...SIZES[size], colorScheme, bypassCSP: true });
    const page = await context.newPage();
    await reach(page);
    await page.waitForTimeout(500);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    audited += 1;
    for (const v of violations)
      problems.push(`${colorScheme} ${size} ${name}: ${v.id} (${v.nodes.length})`);
    await context.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join('\n') : `0 violations in ${audited} states`);
process.exitCode = problems.length ? 1 : 0;
```

## 4. Run it

```bash
node audit.mjs http://localhost:4173
```

It prints `0 violations in 32 states`, or one line per rule that failed, with the state and the number of elements. Stop the preview server afterwards and delete `$AUDIT_DIR` when you are done.

When a state is added to the UI (a new dialog, drawer or menu), add it to `STATES` and to the table above, and update the date and count.
