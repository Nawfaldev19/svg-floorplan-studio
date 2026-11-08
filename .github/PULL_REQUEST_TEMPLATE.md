## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `npm run verify` passes locally (lint, knip, format, types, unit and component tests with coverage, build, end-to-end).
- [ ] Tests added or updated for the change (unit for rules in `src/core`, component or end-to-end for UI).
- [ ] The feature's entry in `docs/reference/features.md` is updated, and `docs/testing/traceability.md` if tests moved.
- [ ] An ADR is added in `docs/adr/` if this makes or changes a design decision.
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`.
- [ ] Accessibility considered: works with the keyboard alone, names and announcements make sense, no new colour-only meaning.
- [ ] Security considered: new input goes through `parseDocument` or an equivalent check, no HTML strings, no network calls, no new permissions in workflows.
- [ ] Commit messages follow Conventional Commits.
