---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Anchor items at their centre and store rotation in degrees

## Context and Problem Statement

A top-left anchor makes rotation need a separate pivot, and radians suit the maths but not an inspector field. How should an item's placement be stored?

## Decision Drivers

- No pivot bookkeeping.
- Readable inspector numbers.
- Older files keep loading.

## Considered Options

- Top-left anchor, rotation in radians (the schema version 1 layout).
- Centre anchor, clockwise rotation in degrees.

## Decision Outcome

Chosen option: "centre anchor with degrees", because the centre is the natural pivot and degrees are readable. [`PlanItem`](../../src/core/types.ts) stores centre, size and clockwise degrees; only geometry functions use radians.

### Consequences

- Good, because every geometric question is a pure function of the item.
- Neutral, because version 1 files are migrated on import ([`migrateV1`](../../src/core/document.ts)), which shows a versioned format evolving without breaking files.

### Confirmation

Unit tests "moves the anchor to the centre and converts radians to degrees" and "is applied automatically on import and mentioned in the notes" in [`tests/unit/document.test.ts`](../../tests/unit/document.test.ts).

## Pros and Cons of the Options

### Top-left and radians

- Good, because it matches many drawing tools.
- Bad, because rotating needs a pivot, and radians are hard to type.

### Centre and degrees

- Good, because rotation needs no pivot and the inspector shows degrees.
- Bad, because version 1 files need a migration.

## More Information

[ADR 0014](0014-validate-migrated-files-against-current-schema.md) checks the migrated layout against the current bounds.
