# Configuration

The app reads no environment variables: it is a static front end with no server, API keys or secrets, so there is no `.env.example`. What can be configured is listed below with its default and where it is read.

## Development and preview servers

All of these are set in [`vite.config.ts`](../../vite.config.ts).

| Option              | Default                      | Description                                                                                                                               |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server port     | 5173                         | `npm run dev`. `strictPort` is on, so a busy port fails instead of moving.                                                                |
| Preview server port | 4173                         | `npm run preview`; the end-to-end tests run against it ([`playwright.config.ts`](../../playwright.config.ts) uses the same port).         |
| Security headers    | `BASE_HEADERS`               | Sent by both servers; the CSP header by preview only. The full list is in [ADR 0013](../adr/0013-security-headers-and-build-time-csp.md). |
| CSP `<meta>` tag    | on in builds                 | `contentSecurityPolicyMeta` inserts it right after `<meta charset>` in `dist/index.html` during `npm run build`.                          |
| Asset inlining      | off (`assetsInlineLimit: 0`) | Keeps fonts and images on `'self'`, so the policy needs no `data:`.                                                                       |
| Source maps         | `'hidden'`                   | Written next to the built files but not linked from them.                                                                                 |

To host the build elsewhere, see [deploy-the-static-build.md](../how-to/deploy-the-static-build.md).

## Test runners

| Option                     | Default                                                     | Where read                                                                                         | Description                                                                                             |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `CI`                       | unset                                                       | [`playwright.config.ts`](../../playwright.config.ts)                                               | When set: `forbidOnly`, one retry, the GitHub reporter, and no reuse of an already-running server.      |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright's default cache                                  | Playwright itself                                                                                  | Where Chromium is installed (`npx playwright install chromium`).                                        |
| Browser channel            | `chromium` (new headless)                                   | [`vitest.config.ts`](../../vitest.config.ts), [`playwright.config.ts`](../../playwright.config.ts) | See [ADR 0007](../adr/0007-test-components-in-a-real-browser.md).                                       |
| Coverage thresholds        | on `src/core/**`                                            | [`vitest.config.ts`](../../vitest.config.ts)                                                       | The coverage run fails below them; the figures are in the [test strategy](../testing/strategy.md).      |
| Component test window      | 1280 × 800                                                  | [`vitest.config.ts`](../../vitest.config.ts)                                                       | The wide editor layout; `editor-compact.test.tsx` resizes to 375 × 812.                                 |
| End-to-end projects        | `desktop`, `mobile` (Pixel 7), `tablet` (768 × 1024, touch) | [`playwright.config.ts`](../../playwright.config.ts)                                               | `mobile` runs tests tagged `@mobile`, `tablet` those tagged `@tablet`; `desktop` skips `touch.spec.ts`. |

## Application constants

Code constants, not runtime settings: changing one is a code change with tests.

| Constant                         | Value                              | Where                                                           | Meaning                                                                                                                                               |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_ITEMS`                      | 10,000                             | [`limits.ts`](../../src/core/limits.ts)                         | Most items (and groups) in a plan.                                                                                                                    |
| `MAX_COORDINATE`                 | 1,000,000 cm                       | [`limits.ts`](../../src/core/limits.ts)                         | Largest absolute coordinate, width or height.                                                                                                         |
| `MAX_NAME_LENGTH`                | 120                                | [`limits.ts`](../../src/core/limits.ts)                         | Longest item, group or plan name.                                                                                                                     |
| `MIN_GRID_SIZE`, `MAX_GRID_SIZE` | 1, 500 cm                          | [`limits.ts`](../../src/core/limits.ts)                         | Smallest and largest grid step.                                                                                                                       |
| `MAX_IMPORT_BYTES`               | 8 MB                               | [`limits.ts`](../../src/core/limits.ts)                         | Largest file the importer reads.                                                                                                                      |
| `HISTORY_LIMIT`                  | 200                                | [`history.ts`](../../src/core/history.ts)                       | Undo steps kept.                                                                                                                                      |
| `COALESCE_WINDOW_MS`             | 1000                               | [`history.ts`](../../src/core/history.ts)                       | Nudges of the same selection closer together than this merge into one undo step.                                                                      |
| `AUTOSAVE_DELAY_MS`              | 400                                | [`useEditor.ts`](../../src/editor/useEditor.ts)                 | Quiet time before an autosave.                                                                                                                        |
| `MIN_SCALE`, `MAX_SCALE`         | 0.1, 8 px per cm                   | [`viewport.ts`](../../src/core/viewport.ts)                     | Zoom range.                                                                                                                                           |
| `MAX_MEMBER_OUTLINES`            | 400                                | [`SelectionOverlay.tsx`](../../src/editor/SelectionOverlay.tsx) | Above this many selected members only the group box is drawn.                                                                                         |
| `STORAGE_KEY`                    | `floorplan-studio.plan`            | [`storage.ts`](../../src/core/storage.ts)                       | `localStorage` key of the saved plan.                                                                                                                 |
| `BACKUP_KEY`                     | `floorplan-studio.plan.unreadable` | [`storage.ts`](../../src/core/storage.ts)                       | Where an unreadable saved plan is copied.                                                                                                             |
| Theme key                        | `floorplan-studio.theme`           | [`useTheme.ts`](../../src/shared/useTheme.ts)                   | `light` or `dark`; absent means follow the system.                                                                                                    |
| Item kinds and sizes             | see the catalogue                  | [`catalog.ts`](../../src/core/catalog.ts)                       | Default size, minimum size and shortcut per kind.                                                                                                     |
| Editor layout breakpoints        | 600, 1024, 1280 px                 | [`useEditorLayout.ts`](../../src/editor/useEditorLayout.ts)     | Phone below 600, tablet below 1024, desktop below 1280, wide from 1280 ([ADR 0015](../adr/0015-responsive-editor-with-drawers-and-overflow-menu.md)). |
| `TOUCH_DRAG_THRESHOLD_PX`        | 8 px (3 px for a mouse)            | [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts) | Travel before a press on an item becomes a drag.                                                                                                      |
