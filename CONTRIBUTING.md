# Contributing

Floorplan Studio is a small demo project; contributions that keep it correct, accessible and documented are welcome.

## Prerequisites

- Node.js 22.12+ or 24+; CI uses the version in [`.nvmrc`](.nvmrc).
- Chromium for Playwright: `npx playwright install chromium`.

## Set up

```bash
npm ci
npm run dev    # http://localhost:5173
```

The tutorial [docs/tutorials/getting-started.md](docs/tutorials/getting-started.md) walks through the app.

## The gate

```bash
npm run verify
```

It runs lint (including TSDoc presence on every export), the knip dead-code check, the format check, the type check, unit and component tests with coverage thresholds, the production build and the end-to-end tests, in the same order as CI. A change is done when it passes. Details: [docs/how-to/run-the-tests.md](docs/how-to/run-the-tests.md).

## Branches and commits

- Branch from `main` with a short descriptive name, for example `feat/locker-kind` or `fix/outline-range-select`.
- Write commit messages in [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) form: `feat(editor): …`, `fix(core): …`, `docs: …`, `test(e2e): …`, `ci: …`, `chore: …`. Use `!` or a `BREAKING CHANGE:` footer for a change to the file format or the `PlanViewer` props.
- Open a pull request; the template lists the checks.

## Code style

- Prettier formats everything (`npm run format`); ESLint uses the type-checked strict rules and must report zero warnings.
- Keep rules in `src/core` as pure, unit-tested functions; components translate input into reducer actions and render state ([ADR 0001](docs/adr/0001-framework-free-core.md)).
- Document every export with [TSDoc](https://tsdoc.org) and start each source file with a one- to four-line header comment. `eslint-plugin-jsdoc` enforces presence on exported functions, classes, interfaces, type aliases and constants in `src/` (`jsdoc/require-jsdoc`), accepts the TSDoc tags `@remarks`, `@packageDocumentation`, `@defaultValue` and `@typeParam`, and forbids types in comments. It checks presence, not quality: comments explain why and state invariants; no commented-out code, no TODOs without a CHANGELOG or limitations entry.
- Accessibility is part of the definition of a feature: every pointer action needs a keyboard path, every control a name, every status change an announcement.

## Docs as code

A pull request that changes behaviour updates, in the same pull request:

1. the feature's entry in [docs/reference/features.md](docs/reference/features.md) (or adds one), and [docs/testing/traceability.md](docs/testing/traceability.md);
2. an ADR in [docs/adr/](docs/adr/README.md) if it makes or changes a design decision;
3. [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`;
4. any reference page it affects: [keyboard.md](docs/reference/keyboard.md) (checked by a test), [file-format.md](docs/reference/file-format.md), [configuration.md](docs/reference/configuration.md).

## Adding tests

- **Rules and maths** (`src/core`): a unit test in `tests/unit/<module>.test.ts`, using the helpers in `tests/unit/factories.ts`. Keep them deterministic: no clocks (pass times in, as the `nudge` action's `at` does), seeded randomness only (`seeded`).
- **Panels and widgets:** a component test in `tests/component/`, rendered with the real reducer through `EditorHarness`, queried by role and name; press keys with the `pressKey` command so they arrive as real key presses.
- **Whole flows** (pointer gestures, persistence across reloads, downloads, the security headers): an end-to-end test in `tests/e2e/`. Every end-to-end test fails on a browser console error.
- Coverage of `src/core` must stay at or above 90% lines, functions and statements and 85% branches.

## Folder map

| Path              | What                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `src/core`        | Pure TypeScript: model, limits, geometry, history, reducer, keymap, file format, storage |
| `src/editor`      | Editor UI: canvas, gestures, toolbar, inspector, outline, file menu                      |
| `src/viewer`      | `PlanViewer` and its page                                                                |
| `src/plan`        | SVG pieces shared by editor and viewer                                                   |
| `src/shared`      | App chrome and storage access                                                            |
| `tests/unit`      | Node tests (mostly `src/core`)                                                           |
| `tests/component` | Browser-mode component tests with the real reducer                                       |
| `tests/e2e`       | Playwright tests against the production build                                            |
| `docs/`           | Diátaxis docs, ADRs, security, testing; start at `docs/README.md`                        |

## Security boundaries

- Never commit secrets or `.env` files.
- All untrusted text (imported files, `localStorage`) goes through `parseDocument` in `src/core/document.ts`. Do not add a second parser or skip it.
- Page-level handlers (`window`, `document`) go through `subscribe` or `usePageHandler` in `src/shared/pageHandlers.ts`; a unit test enforces it.
- No `console` calls, no `dangerouslySetInnerHTML` or other HTML-string sinks, and no network requests; the production policy blocks them.
- Keep the Content Security Policy and headers in `vite.config.ts` strict: no `'unsafe-inline'`, `'unsafe-eval'` or third-party origins.
- New dependencies: permissive licence only (MIT, ISC, Apache-2.0, BSD), released at least 14 days ago, and listed in `THIRD_PARTY_NOTICES.md`.
- Workflows: pin actions to full commit SHAs, keep `permissions: contents: read` at the top, and never interpolate untrusted input into `run:`.
- Do not edit `package-lock.json` by hand or commit generated output (`dist/`, `coverage/`, `test-results/`, `playwright-report/`, `.vitest/`).

## Reporting

Bugs and ideas: the issue forms. Vulnerabilities: privately, as described in [SECURITY.md](SECURITY.md). Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
