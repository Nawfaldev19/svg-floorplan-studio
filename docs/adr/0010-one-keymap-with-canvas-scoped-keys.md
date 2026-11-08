---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Keep one keymap table, with character keys scoped to the canvas

## Context and Problem Statement

Single-letter shortcuts that fire anywhere in the editor would act inside buttons, the outline and radio groups, failing WCAG 2.1.4 (Character Key Shortcuts) and breaking arrow keys in the brush's radio group. Hand-written help drifts from the bindings. How should shortcuts be defined and scoped?

## Decision Drivers

- Help text matches behaviour.
- Character keys never fire in another control, nor destructive keys from a button.
- A pure, unit-testable resolver.

## Considered Options

- Shortcuts handled in components, with separate hand-written help.
- One table, `KEYMAP`, with a scope per entry, read by a pure resolver and every help surface.

## Decision Outcome

Chosen option: "one table", because the help cannot then disagree with the behaviour.

- Each [`KEYMAP`](../../src/core/keymap.ts) entry holds the keys as written in help, a description, a scope and the bindings that resolve to a command. `resolveShortcut`, the "?" help dialog and the landing page read it.
- Scopes: `canvas` for character keys and arrows; `selection` for Delete and Backspace, which work on the canvas and in the outline (the two places that show the selection) but never from a toolbar button; `editor` for Escape and Ctrl/⌘ combinations, which work anywhere in the editor except text fields, selects and radio groups.
- The editor's `onKeyDown` resolves keys. If focus falls to the page body, a document handler takes them, so shortcuts never stop working.

### Consequences

- Good, because speech-input and keyboard users cannot edit by accident while working in a panel.
- Bad, because adding an item with a letter key needs focus on the canvas; the toolbar buttons remain for everyone else.

### Confirmation

- [`tests/unit/keymap.test.ts`](../../tests/unit/keymap.test.ts): `KEYMAP` "is the source of the resolver: every binding resolves to its own command", and "deletes only from the canvas or the outline, never from a toolbar button".
- Component tests "ignores single-letter shortcuts and arrows unless the canvas has focus" and "keeps focus on Undo when undoing empties the history, and shortcuts keep working".
- [`tests/unit/keyboard-reference.test.ts`](../../tests/unit/keyboard-reference.test.ts) fails if the [keyboard reference](../reference/keyboard.md) no longer matches `KEYMAP`.

## Pros and Cons of the Options

### Shortcuts in components

- Good, because each panel owns its keys.
- Bad, because scope rules and help repeat per component and drift.

### One table with scopes

- Good, because one resolver applies the scopes everywhere.
- Bad, because a component with its own keys (the outline, the toolbar) must stop them reaching the editor handler.
