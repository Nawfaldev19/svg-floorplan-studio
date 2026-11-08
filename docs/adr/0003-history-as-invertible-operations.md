---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Build history from invertible operations

## Context and Problem Statement

Snapshot undo is simple, but its memory grows with plan size times history length; diff-and-patch libraries are hard to reason about for ordered lists. How should undo and redo be stored?

## Decision Drivers

- Memory scales with what changed, not with the plan.
- A held key or a long drag does not flood the history.
- Each step has a readable label and restores the selection too.

## Considered Options

- Whole-document snapshots per step.
- A generic diff-and-patch library.
- Explicit, invertible operations.

## Decision Outcome

Chosen option: "explicit, invertible operations", because they are small, exact and readable.

Six operation types (`insert`, `remove`, `patch`, `groups`, `title`, `replace`) each have an exact inverse. A change is a labelled list of operations plus the selection before and after; history keeps at most 200. A change may carry a `coalesce` key and time: when it continues the latest change (same key, at most `COALESCE_WINDOW_MS` = 1000 ms later, same selection, nothing undone in between), `record` merges the two and folds patches to the same item, so a held arrow key is one step. See [`src/core/history.ts`](../../src/core/history.ts).

### Consequences

- Good, because a drag of three desks records three small patches.
- Good, because labels give "Undo move 4 items" tooltips and announcements.
- Bad, because `replace` (a preset or an import) stores the whole document before and after: 200 replacements of the 3,000-desk floor would keep 400 plans. They are rare, and the cap bounds the worst case.
- Bad, because every new edit type must produce correct operations.

### Confirmation

A seeded round-trip test in [`tests/unit/history.test.ts`](../../tests/unit/history.test.ts) generates 500 random changes over all six types and checks that a change followed by its inverse returns the exact original. "record, merging a burst of changes" there and "holding an arrow key" in [`tests/unit/editor.test.ts`](../../tests/unit/editor.test.ts) cover merging.

## Pros and Cons of the Options

### Snapshots

- Good, because there is nothing to get wrong.
- Bad, because a 3,000-item plan over 200 steps would cost megabytes.

### Diff-and-patch library

- Good, because it handles any shape of data.
- Bad, because ordered-list diffs are opaque, and it adds a dependency.

### Invertible operations

- Good, because each step is small and labelled.
- Bad, because each inverse must be right.

## More Information

[Geometry and history](../explanation/geometry-and-history.md) explains apply, invert and coalescing.
