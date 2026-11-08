---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Preview pointer gestures outside the document

## Context and Problem Statement

An edit per pointer move would create hundreds of history entries per drag and run the reducer at pointer frequency. How should drags, resizes, rotations and brush strokes reach the document?

## Decision Drivers

- One gesture, one undo step.
- Autosave never stores a half-finished drag.
- A document change mid-gesture must not crash or corrupt history.

## Considered Options

- An edit on every move, merging history entries afterwards.
- A preview outside the document, committed once on release.

## Decision Outcome

Chosen option: "preview outside the document", because it gives one step per gesture by construction. [`useCanvasGestures`](../../src/editor/useCanvasGestures.ts) keeps a map of item overrides and on release dispatches one `commitItems` action from the final pointer sample, which the reducer diffs into patches.

Each gesture remembers the document it started from. If that changes mid-gesture (Delete or Ctrl+Z), the preview is hidden and release commits nothing. As a second guard, `commitItems` patches only the changed fields onto the current items and skips items that no longer exist.

### Consequences

- Good, because autosave only ever sees committed states.
- Good, because pointer-cancel or Escape just drops the preview; the selection stays.
- Bad, because the canvas merges overrides into the item list while rendering.

### Confirmation

- Unit tests "commits a gesture as one undoable step" and "gestures that outlive their items" in [`tests/unit/editor.test.ts`](../../tests/unit/editor.test.ts).
- End-to-end tests "drags an item onto the grid, and undo / redo restore it in one step", "a keyboard delete during a drag cancels the drag instead of crashing" and "Escape during a drag drops it and keeps the selection" in [`tests/e2e/editor.spec.ts`](../../tests/e2e/editor.spec.ts).

## Pros and Cons of the Options

### Edit on every move

- Good, because the document always shows the live state.
- Bad, because history needs merging heuristics and autosave can catch a half-finished drag.

### Preview, then commit once

- Good, because history, autosave and the document stay simple.
- Bad, because rendering must apply overrides.
