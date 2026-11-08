# Test strategy

How Floorplan Studio is tested, what each level proves, and what is not covered. This page is the one place for test counts and coverage figures. Feature-by-feature links are in [traceability.md](traceability.md); commands are in [run-the-tests.md](../how-to/run-the-tests.md).

## Levels

Most rules are pure functions in `src/core`, tested in Node; panels and hooks are tested in a real browser with the real reducer; whole flows run against the production build.

| Level      | Tool                              | Location          | Files | Tests | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------- | ----------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit       | Vitest in Node                    | `tests/unit`      | 16    | 219   | Geometry and viewport maths, arranging (including a property test that turns are reversible), history inverses and merging, the reducer's rules, limits and id minting, the keymap and its scopes, the keyboard reference matching `KEYMAP`, import validation and migration, storage failures, culling, reading order, the single owner of page-level handlers, and WCAG contrast of every documented token pair in both themes. |
| Component  | Vitest browser mode, Chromium     | `tests/component` | 6     | 53    | Panels wired to the real reducer: outline multi-select, inspector commits and errors, presets, the roving toolbar, focus kept on disabled controls and across breakpoints, scoped shortcuts, merged nudges, the menu button, the phone layout, the viewer's Tab stop and keyboard reach, and the gesture hook driven through `PointerSample` (threshold, resize, pinch, Escape, one-frame marquee, touch pan).                    |
| End-to-end | Playwright against `vite preview` | `tests/e2e`       | 3     | 46    | Full flows in the production build under the security headers: keyboard-only editing, snapped drags with undo, resize and rotate, navigation, marquee, tag brush, clipboard, Escape and Delete during a drag, autosave across reloads and tabs, import and export, culling on the 3,000-item floor, the viewer, themes, injection staying inert, every security header, and touch flows on a phone and a tablet.                  |

Total: **318 automated tests**: 272 in Vitest (219 unit, 53 component) and 46 Playwright runs (31 desktop, 10 phone, 5 tablet), counted on 2026-10-18.

Playwright projects ([`playwright.config.ts`](../../playwright.config.ts)): `desktop` (Desktop Chrome, 1280 × 720) runs every spec except `touch.spec.ts`; `mobile` (Pixel 7, 412 × 839, touch) runs tests tagged `@mobile`; `tablet` (768 × 1024, touch) runs tests tagged `@tablet`. Touch drags and pinches are synthesized by Chromium through the DevTools Protocol, so the page receives real touch input; Chromium adds its touch slop, so those tests check ranges and grid alignment. Component tests run in a 1280 × 800 window unless a test resizes it.

Tests use what a user sees (roles, names, values, announcements). The exceptions are the `data-rendered-items` attribute that reports culling, `data-outlines` on the selection overlay, and the transform of the canvas layer, which the end-to-end tests read to turn an item's world position into a page position. Component tests press keys through a Vitest browser command (`pressKey` in [`vitest.config.ts`](../../vitest.config.ts)) that uses Playwright's keyboard.

**Every end-to-end test fails on a browser console error** (a `beforeEach`/`afterEach` pair in each of the three spec files). Chromium reports Content Security Policy and Trusted Types violations there, so the suite doubles as a policy check.

## Coverage

V8 coverage over unit and component tests (`npm run test:coverage`), run on 2026-10-18:

| Area         | Lines | Statements | Branches | Functions |
| ------------ | ----- | ---------- | -------- | --------- |
| `src/core`   | 100%  | 99.6%      | 95.7%    | 100%      |
| All of `src` | 91.8% | 90.6%      | 85.2%    | 89.9%     |

The run fails if `src/core` drops below 90% lines, functions and statements or 85% branches ([`vitest.config.ts`](../../vitest.config.ts)). The UI total is lower because the landing page, the app shell and parts of the canvas are exercised by Playwright, whose runs V8 coverage cannot see.

## Test data and determinism

- **Seed plans** are built in code ([`seed.ts`](../../src/core/seed.ts)) with fictional names; the stress floor uses a seeded xorshift32 generator.
- **Factories and seeded randomness:** [`tests/unit/factories.ts`](../../tests/unit/factories.ts) builds items and documents and provides `seeded`, a small linear congruential generator used by the history round trip, the rotation property test and the reading-order test.
- **No clocks:** the reducer takes time as data (the `nudge` action's `at`), and no test uses fake timers. Tests that depend on autosave wait for the visible status or trigger the immediate save.
- **Isolation:** every end-to-end test starts by clearing `localStorage`.
- **Browser:** the full Chromium build in "new headless" mode ([ADR 0007](../adr/0007-test-components-in-a-real-browser.md)).

## Edge cases covered on purpose

- **Geometry:** rotated hit tests and resizing with the opposite corner fixed; ellipses; thin walls; zoom anchors and clamping; pinch keeping both fingers' world points.
- **History:** the apply-then-invert round trip on 500 seeded changes over all six operation types; the selection restored by undo and redo; the 200-entry cap; merging of nudges only within the window, for the same selection and with nothing undone.
- **Rotation:** `+θ` then `−θ` restores 50 seeded uneven layouts; 24 turns of 15° return to the start.
- **Limits and ids:** unique short copy names; clamped coordinates and sizes; the 10,000-item cap; autosave refusing a plan the loader would reject; ids never reused after undoing a replacement; imported ids with huge suffixes still minting valid, distinct ids.
- **Import:** invalid JSON, missing or future versions, bad kinds, negative sizes, unsafe and duplicate ids, item and group id clashes, dangling groups, a grid step below 1 cm, repeated tags, too many items, capped error lists, unknown keys including `__proto__`, and version 1 migration with re-validation.
- **Gestures:** stale gestures after a delete or undo, Escape mid-drag, a press below the drag threshold, a marquee within one frame, a third finger during a pinch.
- **Focus:** disabled toolbar buttons, layout changes across 1024 px, a dialog whose body scrolls.
- **Storage and injection:** read and write failures, corrupt content with backup, another tab's save, markup in names and the stored theme staying text.

## Static checks and CI

What each workflow runs:

| Workflow (`.github/workflows/`) | Runs                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml` → `verify`             | The steps of `npm run verify`: lint, knip, format check, type check, coverage, build, end-to-end. Uploads the Playwright report on failure. |
| `ci.yml` → `supply-chain`       | `npm audit` (blocking for runtime dependencies, report-only for all) and a CycloneDX SBOM artifact.                                         |
| `dependency-review.yml`         | Blocks pull requests that add dependencies with high or critical advisories.                                                                |
| `scorecard.yml`                 | OpenSSF Scorecard.                                                                                                                          |

Accessibility is also audited with axe-core on demand, outside the suite: [audit-accessibility.md](../how-to/audit-accessibility.md).

## Known gaps

- CI does not run the accessibility audit; it is an on-demand check.
- Touch is tested in emulated Chromium viewports only, not on devices.
- No performance benchmark: the stress-floor test checks culling, not frame times.
- No visual-regression snapshots.
- Only Chromium is automated; Firefox and Safari are not.
- Screen-reader behaviour is checked through the accessibility tree, not with VoiceOver or NVDA.
- CodeQL default setup and Scorecard results exist only once the repository is on GitHub and the settings are enabled.
