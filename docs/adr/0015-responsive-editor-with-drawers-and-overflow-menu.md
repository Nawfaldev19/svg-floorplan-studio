---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Make the editor responsive with drawers, an overflow menu and touch-sized targets

## Context and Problem Statement

On a 375 px phone a sidebar beside the canvas does not fit, stacking it under the canvas makes the page scroll, a full toolbar wraps, and mouse-sized controls are too small for fingers. How should the editor lay out on phones, tablets and narrow laptops so every tool stays reachable by keyboard or finger?

## Decision Drivers

- Every command reachable at every width, with no sideways scroll (WCAG 1.4.10 Reflow).
- The canvas gets the most room; opening a panel does not move the camera.
- WAI-ARIA Authoring Practices widgets, one toolbar Tab stop, predictable focus.
- Targets of at least 24 px (WCAG 2.5.8), 44 px on touch screens where the layout allows (2.5.5).
- No new dependency; one set of breakpoints for script and CSS.

## Considered Options

- The stacked layout with smaller paddings.
- A full-bleed canvas with the outline and inspector as **modal** dialogs.
- A full-bleed canvas with **non-modal drawers** (disclosure pattern), tools moving into menu buttons as the window narrows, and a control-size token that grows on coarse pointers.

## Decision Outcome

Chosen option: "non-modal drawers, menu buttons and a control-size token", because the canvas stays usable beside an open panel (tap another item and the inspector follows it) and every tool stays one or two taps away.

[`useEditorLayout`](../../src/editor/useEditorLayout.ts) picks one of four layouts and exposes it to CSS as `data-layout` on the editor:

| Layout    | Width        | Panels                                                | Toolbar                                                                              |
| --------- | ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `wide`    | ≥ 1280 px    | Sidebar: inspector above, outline below, each scrolls | Every tool; mode, Import and Export show text, the rest are icons with tooltips      |
| `desktop` | 1024–1279 px | Sidebar                                               | File tools and the shortcut help move into "More tools"                              |
| `tablet`  | 600–1023 px  | Right-hand drawer over the canvas                     | "Add" menu; duplicate and delete stay; grouping, file tools and help in "More tools" |
| `phone`   | < 600 px     | Bottom sheet over the canvas (62 % high, max 560 px)  | Modes, "Add", undo and redo; everything else in "More tools"                         |

- **Drawers** ([`DrawerPane`](../../src/editor/DrawerPane.tsx)) open from the Outline and Inspector toggles in the status bar (`aria-expanded`, `aria-controls`), one at a time, over the canvas without resizing it. Escape outside a text field, or the close button, returns focus to the toggle. The zoom controls and brush palette move clear, and "Fit selection" fits into the area the drawer, the sheet and the zoom controls leave uncovered. [F-23](../reference/features.md#f-23-responsive-layout-and-touch) describes focus on opening and on crossing a breakpoint.
- **Menus** ([`MenuButton`](../../src/shared/MenuButton.tsx)) follow the WAI-ARIA menu button pattern and close on Escape, Tab, focus leaving or a press outside. Disabled items stay focusable with `aria-disabled`, like disabled toolbar buttons.
- **Targets:** `--size-control` is 36 px, 44 px under `(pointer: coarse)`; text fields use at least 16 px type on touch screens so browsers do not zoom on focus.
- **Touch:** one finger on an item selects and drags it, one finger on empty space pans (in the tag brush too), two fingers pinch. A drag starts after 8 px of travel for touch, 3 px for a mouse. In the outline a finger picks on release, so a swipe scrolls without selecting.
- **Motion:** the drawer slide and menu fade stop under `prefers-reduced-motion: reduce`.

### Consequences

- Good, because a 375 px phone and a 768 px tablet can edit a plan without the page scrolling either way.
- Good, because desktop keyboard behaviour is unchanged, and tests drive each layout by window size alone.
- Bad, because a tool's place depends on the width; the shortcut help and tooltips name each tool, and shortcuts work in every layout.
- Bad, because the open phone sheet hides the lower canvas; the camera moves only on "Fit selection".

### Confirmation

- [`tests/e2e/touch.spec.ts`](../../tests/e2e/touch.spec.ts), in the `mobile` (Pixel 7) and `tablet` (768 × 1024) Playwright projects: drawers, tap and drag, pan and pinch, menus, 44 px targets, an outline swipe that selects nothing, and "Fit selection" keeping the item clear of the zoom controls and the sheet.
- [`tests/component/editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx) "opens the drawer holding the focused field when the window narrows, and forgets it when it widens".
- [`tests/e2e/site.spec.ts`](../../tests/e2e/site.spec.ts) "no view scrolls sideways, including open drawers and menus", on desktop, phone and tablet.
- [`tests/component/editor-compact.test.tsx`](../../tests/component/editor-compact.test.tsx): the menu keyboard model, drawer focus and Escape in a phone-sized window.

## Pros and Cons of the Options

### Stacked layout with smaller paddings

- Good, because it needs the least code.
- Bad, because the page scrolls, the canvas is small and the toolbar wraps.

### Modal dialogs for the panels

- Good, because native `<dialog>` supplies the focus trap.
- Bad, because the canvas is inert while the inspector is open, so checking an edit means closing it.

### Non-modal drawers, menu buttons and a size token

- Good, because the canvas stays live.
- Bad, because focus management and the menu keyboard model are code to maintain.

## More Information

Related: [ADR 0008](0008-listbox-and-inspector-as-keyboard-alternative.md) (the keyboard route), [ADR 0010](0010-one-keymap-with-canvas-scoped-keys.md) (shortcuts in every layout), [design tokens](../reference/design-tokens.md).
