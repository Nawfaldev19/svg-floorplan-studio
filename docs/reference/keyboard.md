# Keyboard and pointer reference

Every editor shortcut, from [`KEYMAP`](../../src/core/keymap.ts), the table that also drives the resolver, the "?" help and the overview page. [`keyboard-reference.test.ts`](../../tests/unit/keyboard-reference.test.ts) checks the first two tables against `KEYMAP` and `POINTER_HELP`; update them here when it fails.

- **Canvas focused:** only while the plan canvas has focus, so character keys and arrows never fire in a button, list or field (WCAG 2.1.4, [ADR 0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md)).
- **Canvas or outline focused:** on the canvas and in the outline, the two places that show the selection, so Backspace on a toolbar button deletes nothing.
- **Anywhere in the editor:** except text fields, selects, radio groups and open dialogs.
- Ctrl is ⌘ on macOS.

## Keyboard

<!-- keymap:start -->

| Keys                       | Action                                                                                                           | Works when                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Ctrl/⌘ Z                   | Undo                                                                                                             | Anywhere in the editor    |
| Ctrl/⌘ Shift Z or Ctrl/⌘ Y | Redo                                                                                                             | Anywhere in the editor    |
| Ctrl/⌘ C, X, V             | Copy, cut and paste the selection                                                                                | Anywhere in the editor    |
| Ctrl/⌘ D                   | Duplicate                                                                                                        | Anywhere in the editor    |
| Ctrl/⌘ G                   | Group (add Shift to ungroup)                                                                                     | Anywhere in the editor    |
| Ctrl/⌘ A                   | Select all                                                                                                       | Anywhere in the editor    |
| Delete or Backspace        | Delete the selection                                                                                             | Canvas or outline focused |
| Esc                        | Leave the tag brush, then clear the selection                                                                    | Anywhere in the editor    |
| Arrow keys                 | Nudge the selection one grid step (Shift: five steps)                                                            | Canvas focused            |
| [ and ]                    | Rotate 15° anticlockwise or clockwise (Shift: 90°)                                                               | Canvas focused            |
| D M L P W                  | Add a desk, meeting room, lounge, planter, wall                                                                  | Canvas focused            |
| + − 0                      | Zoom in, zoom out, zoom to 100%                                                                                  | Canvas focused            |
| F                          | Fit the selection, or the whole plan                                                                             | Canvas focused            |
| T                          | Toggle the tag brush                                                                                             | Canvas focused            |
| 1 to 5                     | In the tag brush, pick the tag: 1 Standing desk, 2 Dual monitor, 3 Quiet area, 4 By a window, 5 Step-free access | Canvas focused            |
| ?                          | Show these shortcuts                                                                                             | Canvas focused            |

<!-- keymap:end -->

## Pointer

<!-- pointer:start -->

| Gesture                        | Action                                              |
| ------------------------------ | --------------------------------------------------- |
| Wheel                          | Pan the editor canvas (the viewer scrolls the page) |
| Ctrl/⌘ + wheel or pinch        | Zoom at the pointer                                 |
| Space + drag, or middle button | Pan                                                 |
| Shift + click                  | Add to or remove from the selection                 |
| Alt + click                    | Pick one member of a group                          |
| Alt while dragging             | Move or resize without snapping to the grid         |
| Shift while resizing           | Keep the proportions                                |
| Shift while rotating           | Snap to 15° steps                                   |
| Esc while dragging             | Cancel the drag                                     |
| Touch: tap or drag an item     | Select it, or select and move it                    |
| Touch: drag empty space        | Pan                                                 |
| Touch: pinch with two fingers  | Zoom                                                |

<!-- pointer:end -->

## Outline list box

The outline follows the WAI-ARIA multi-select list box model. These keys work while it has focus and do not reach the editor shortcuts above (implemented in [`OutlinePanel`](../../src/editor/OutlinePanel.tsx), not in `KEYMAP`).

| Keys              | Action                                                 |
| ----------------- | ------------------------------------------------------ |
| Up, Down          | Move to the previous or next item and select only it   |
| Home, End         | Move to the first or last item and select only it      |
| Ctrl/⌘ + Up, Down | Move the focus ring without changing the selection     |
| Space             | Add the focused item to the selection, or remove it    |
| Shift + Up, Down  | Move and toggle the item moved to                      |
| Shift + Space     | Select the range from the last picked item to this one |

## Inspector number fields

| Keys               | Action                                 |
| ------------------ | -------------------------------------- |
| Enter, or Tab away | Commit the typed value (one undo step) |
| Esc                | Restore the value before typing        |
| Up, Down           | Step by 1 and commit at once           |
| Shift + Up, Down   | Step by 10 and commit at once          |

## Viewer

Implemented in [`PlanViewer`](../../src/viewer/PlanViewer.tsx). The plan's items form one Tab stop; reading order is lines of 40 cm from top to bottom, each left to right. On touch screens one finger pans and two fingers pinch to zoom; while the whole plan is in view, a vertical swipe scrolls the page instead.

| Keys               | Action                                                               |
| ------------------ | -------------------------------------------------------------------- |
| Arrow keys         | Move to the next or previous item in reading order; the view follows |
| Home, End          | Move to the first or last item                                       |
| Enter or Space     | Show the focused item's details                                      |
| Shift + arrow keys | Pan                                                                  |
| + and −            | Zoom in and out                                                      |

## Toolbar

The editor toolbar is one Tab stop (WAI-ARIA toolbar pattern, [`useRovingFocus`](../../src/editor/useRovingFocus.ts)). Left and Right move between its controls; Home and End jump to the first and last. Unavailable controls (Undo with nothing to undo, for example) are marked `aria-disabled` and stay focusable, so focus never drops out of the toolbar.
