# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-10-17

The first release. Each feature is described in the [feature catalogue](docs/reference/features.md).

### Added

- **Floor-plan editor** (F-01 to F-12): pan and zoom with wheel, keys, touch pinch and fit; group-aware selection with marquee; moving with grid snapping, and nudging where a held arrow key is one undo step; resizing from eight handles and rotating, correct for rotated items; add tools; duplicate, copy, cut and paste; align, distribute, and rotate a selection about the mean of its centres so turns are exactly reversible; undo and redo that restore the selection; groups and renaming; amenity tags with a brush; an outline list box and an inspector as the keyboard route to every edit.
- **Viewer** (F-13, F-14): a read-only, embeddable `PlanViewer` with amenity highlighting, item details, one Tab stop with arrow keys in reading order, and touch pan and pinch that leave vertical page scrolling alone at the fitted view.
- **Files and persistence** (F-15 to F-17): autosave to `localStorage` that validates before writing and flushes before leaving the editor; a warning when another tab saves the same plan; JSON import and export with size and item limits and a version 1 migration; demo, blank and 3,000-desk presets with viewport culling.
- **App** (F-18 to F-23): shortcut help generated from the keymap, landing page and hash routing with focus management, an error boundary per view, light and dark themes, and a responsive layout with drawer panels, tool menus and 44 px touch targets below 1024 px.
- **Accessibility:** WAI-ARIA toolbar, listbox, menu button and disclosure patterns; shortcuts scoped to where focus is; unavailable controls that stay focusable; a live region that says where things ended up; a reproducible axe-core audit ([how-to](docs/how-to/audit-accessibility.md)).
- **Tests and tooling:** unit tests in Node, component tests in Chromium, end-to-end tests on desktop, phone and tablet viewports; ESLint with TSDoc presence, knip, Prettier; a CI workflow with dependency review, OpenSSF Scorecard and Dependabot ([test strategy](docs/testing/strategy.md)).

### Security

- Every import and stored plan is size-checked, validated with a Zod schema that drops unknown keys, normalised and re-validated after migration; the editor cannot produce a plan its own importer would reject.
- A Content Security Policy with Trusted Types and no network access, sent as a header and embedded in the built page, plus the headers listed in [ADR 0013](docs/adr/0013-security-headers-and-build-time-csp.md); source maps are not linked from the bundle.
- Workflows pin actions to commit SHAs and run with read-only tokens; dependencies are permissively licensed ([supply chain](docs/security/supply-chain.md), [threat model](docs/security/threat-model.md)).
