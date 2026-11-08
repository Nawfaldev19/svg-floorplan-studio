# Run the tests

## Once per machine

```bash
npm ci
npx playwright install chromium
```

Both Vitest browser mode and Playwright use the full Chromium build in "new headless" mode ([ADR 0007](../adr/0007-test-components-in-a-real-browser.md)). If browsers live somewhere else, set `PLAYWRIGHT_BROWSERS_PATH` to that folder.

## Commands

| Goal                                     | Command                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Unit tests (Node)                        | `npm run test:unit`                                                               |
| Component tests (Chromium)               | `npm run test:component`                                                          |
| Unit and component                       | `npm test`                                                                        |
| Unit and component with coverage         | `npm run test:coverage` (report in `coverage/`)                                   |
| End-to-end (builds, serves on port 4173) | `npm run test:e2e`                                                                |
| One end-to-end file                      | `npx playwright test tests/e2e/site.spec.ts`                                      |
| One device project (phone or tablet)     | `npx playwright test --project=mobile` or `--project=tablet`                      |
| One test by name                         | `npx vitest run -t "rounds to the nearest"` or `npx playwright test -g "marquee"` |
| Everything CI runs, in order             | `npm run verify`                                                                  |

`npm run verify` is lint, knip, format check, type check, unit and component tests with coverage, build, and end-to-end tests. It is the definition of done ([CONTRIBUTING.md](../../CONTRIBUTING.md)).

## When something fails

- **Coverage below threshold:** the run lists the files; `src/core/**` must stay at 90% lines, functions and statements and 85% branches.
- **`keyboard-reference.test.ts`:** [docs/reference/keyboard.md](../reference/keyboard.md) no longer matches `KEYMAP`; update the table.
- **End-to-end "console errors":** every end-to-end test fails on a browser console error, which is where Content Security Policy and Trusted Types violations are reported. Open the trace (`npx playwright show-trace test-results/…/trace.zip`).
- **Port 4173 in use:** stop the other preview server; the config uses `strictPort`.
- **An accessibility check:** run the ad-hoc axe-core audit in [audit-accessibility.md](audit-accessibility.md).

What each level proves is in [docs/testing/strategy.md](../testing/strategy.md).
