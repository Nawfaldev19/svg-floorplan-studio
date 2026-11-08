---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Validate migrated files against the current schema

## Context and Problem Statement

Version 1 files pass the version 1 schema, then the migration computes new values: centre `left + w / 2`, rotation `angleRad × 180 / π`. Valid input can leave the version 2 bounds: a `left` and a `w` of 1,000,000 put the centre at 1,500,000 cm, and an `angleRad` of 1e308 overflows to infinity, which normalising would make `NaN`. Such a plan would load, autosave would refuse it, and edits would be silently lost. How should migrated data be checked?

## Decision Drivers

- Whatever the importer accepts, autosave can write.
- No duplicated bounds.

## Considered Options

- Clamp values inside `migrateV1`.
- Run the migrated document through the version 2 schema before normalising.

## Decision Outcome

Chosen option: "validate with the version 2 schema", because it reuses the existing bounds and rejects the file with a precise path instead of silently moving items. Its errors start with "after upgrading from version 1," so the user knows which step failed ([`parseDocument`](../../src/core/document.ts)).

### Consequences

- Good, because every accepted file, of any version, satisfies the current bounds.
- Bad, because a version 1 file whose converted values leave those bounds is refused, not clamped. The app never writes such a file.

### Confirmation

Unit test "checks the upgraded plan against the current bounds as well" in [`tests/unit/document.test.ts`](../../tests/unit/document.test.ts).

## Pros and Cons of the Options

### Clamp inside `migrateV1`

- Good, because more old files would load.
- Bad, because it duplicates the bounds and moves items silently.

### Version 2 schema

- Good, because it reuses the bounds and names the failing path.
- Bad, because such files are refused, not repaired.
