---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Make the editor enforce the file format's limits

## Context and Problem Statement

The importer rejects plans outside its bounds (item count, coordinates, name length). An editor without the same bounds can save a plan its loader refuses, such as a name past 120 characters after many duplicates of a copy. The next load would fall back to the demo plan, and the first edit would overwrite the user's work. How do we make sure the editor never produces a plan it cannot load?

## Decision Drivers

- No sequence of edits loses data.
- One source of truth for the bounds.
- Failures are visible.

## Considered Options

- Validate only on import, and trust the editor.
- Share the bounds between importer and reducer, validate before every save, and back up anything unreadable.

## Decision Outcome

Chosen option: "share the bounds and validate before every save". Schema and reducer both read [`limits.ts`](../../src/core/limits.ts), and three independent layers follow:

- The reducer clamps every geometry change ([`sanitizeGeometry`](../../src/core/transform.ts)), trims and shortens names, numbers copies instead of appending "copy" again, and refuses an add, duplicate or paste past the item limit, announcing why.
- Autosave runs the exact loader on the serialised text and never writes a plan that fails ([`savePlan`](../../src/core/storage.ts)).
- An unreadable saved plan is copied to a backup key before the demo replaces it ([`backUpUnreadablePlan`](../../src/core/storage.ts)).

### Consequences

- Good, because three unit-tested layers stand between an edit and data loss.
- Bad, because every autosave parses the whole plan again, in linear time; the 400 ms debounce keeps that off the typing path.

### Confirmation

- [`tests/unit/editor.test.ts`](../../tests/unit/editor.test.ts) "limits of the file format".
- [`tests/unit/seed-storage-culling.test.ts`](../../tests/unit/seed-storage-culling.test.ts) "never losing a saved plan" and "backUpUnreadablePlan".
- End-to-end test "a corrupt saved plan falls back to the demo and is kept as a backup".

## Pros and Cons of the Options

### Validate only on import

- Good, because saves do less work.
- Bad, because it allows the data loss above.

### Shared bounds and validated saves

- Good, because the loader never rejects what the editor wrote.
- Bad, because of the extra parse per save.
