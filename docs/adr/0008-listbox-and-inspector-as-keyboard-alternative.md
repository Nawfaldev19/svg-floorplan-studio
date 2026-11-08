---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Offer a listbox plus inspector as the keyboard alternative, not focusable canvas items

## Context and Problem Statement

WCAG 2.1.1 requires every function to work from a keyboard. A Tab stop per item on an editable canvas means hundreds of stops and no clear way to say "move this by 10 cm". How should keyboard users choose and edit items?

## Decision Drivers

- Every editing function works without a pointer.
- A short, predictable Tab order.
- Exact numeric edits, not only nudges.

## Considered Options

- Make every canvas item focusable.
- An outline listbox for choosing, an inspector for editing, arrow-key nudging on the canvas.

## Decision Outcome

Chosen option: "outline listbox plus inspector", because it gives a short Tab order and exact edits.

- The outline ([`OutlinePanel`](../../src/editor/OutlinePanel.tsx)) is an ARIA listbox on the WAI-ARIA multi-select model (`aria-activedescendant`, Up/Down/Home/End/Space). It and the canvas drive each other's selection.
- Labelled numeric fields ([`NumberField`](../../src/editor/NumberField.tsx)) edit geometry; arrow keys nudge.
- A live region announces each change, including where things ended up.
- The read-only viewer, with nothing to edit, makes items focusable buttons behind one Tab stop, with arrow-key navigation.

### Consequences

- Good, because selection, geometry, grouping, tagging, the clipboard, undo and zoom all work without a pointer, in the Tab order toolbar (one stop), canvas, inspector, outline.
- Bad, because keyboard users move through a list, not space: there is no spatial "next item to the right", and the marquee and free panning have no keyboard twin (the outline's multi-select and zoom/fit cover those needs).

### Confirmation

- Component tests "builds a multi-selection from the keyboard alone" and the inspector tests in [`tests/component/editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx).
- End-to-end tests "adds, nudges and deletes an item with the keyboard only" and "the outline listbox drives selection from the keyboard".

## Pros and Cons of the Options

### Focusable canvas items

- Good, because spatial navigation would be possible.
- Bad, because of hundreds of Tab stops and no way to type an exact position.

### Listbox plus inspector

- Good, because screen readers know these patterns well.
- Bad, because it is a list, not a map.
