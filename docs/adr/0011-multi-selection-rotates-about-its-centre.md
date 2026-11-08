---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Rotate a multi-selection about the mean of its centres

## Context and Problem Statement

The `[` and `]` keys and the Arrange panel turn the selection in 15° or 90° steps. Turning each item about its own centre pulls a desk pod apart; turning the selection as one shape needs a pivot, and a pivot that moves between turns makes repeated turns drift. How should several items rotate?

## Decision Drivers

- A group keeps its layout when turned.
- A single item turns in place.
- A turn and its opposite restore the layout exactly.

## Considered Options

- Each item about its own centre.
- One rigid shape about the centre of its rotated bounding box.
- One rigid shape about the mean of the item centres.

## Decision Outcome

Chosen option: "one rigid shape about the mean of the item centres", because that is what turning a pod means and the pivot stays put. [`rotateItemsBy`](../../src/core/arrange.ts) turns every centre about the mean and adds the angle to each item's rotation. The mean turns with the shape, so it is the same point before and after; a single item's mean is its own centre.

### Consequences

- Good, because a pod keeps its layout, `+θ` then `−θ` restores it, and 24 turns of 15° come back to the start.
- Bad, because for an uneven selection (a large room and a small planter) the pivot is not the visual centre.
- Bad, because positions after a turn are off the grid. A later drag snaps only the grabbed item; the others keep their offsets from it.

### Confirmation

- [`tests/unit/editor.test.ts`](../../tests/unit/editor.test.ts) "rotating back and forth": a seeded property test over random uneven layouts checks that `+θ` then `−θ`, and 24 turns of 15°, restore every position and angle.
- [`tests/unit/arrange.test.ts`](../../tests/unit/arrange.test.ts) "turns several items as one shape about the mean of their centres" and "keeps its pivot on an uneven selection, so a turn and its opposite cancel out".

## Pros and Cons of the Options

### Each item about its own centre

- Good, because items stay on the grid.
- Bad, because a pod falls apart into separately turned desks.

### Centre of the rotated bounding box

- Good, because it is the visual centre of the selection.
- Bad, because the box of an uneven selection changes shape as it turns, so the pivot moves: a 100 cm room and a 10 cm planter 200 cm apart, turned 45°, shift it by about 22 cm.

### Mean of the item centres

- Good, because the pivot is invariant under the turn.
- Bad, because it weights a small item as much as a large one.
