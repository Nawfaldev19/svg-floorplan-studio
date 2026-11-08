# Feature catalogue

One entry per user-facing feature, under the README's IDs. [traceability.md](../testing/traceability.md) names the tests behind each part; keys are in [keyboard.md](keyboard.md), and accessibility checks in [ACCESSIBILITY.md](../../ACCESSIBILITY.md).

## F-01 Canvas navigation

- **What:** pan and zoom with the [pointer, touch](keyboard.md#pointer), keys or buttons; F fits the selection or plan.
- **Why:** a floor is larger than the screen.
- **Where:** [`viewport.ts`](../../src/core/viewport.ts), [`culling.ts`](../../src/core/culling.ts), [`useWheelZoom.ts`](../../src/plan/useWheelZoom.ts), [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts), [`EditorPage.tsx`](../../src/editor/EditorPage.tsx).
- **How it works:** the camera lives outside the reducer, so zoom is never undone and edits never move the view. `zoomAt` and `pinchViewport` keep the world point under the cursor or fingers fixed ([coordinates](../explanation/geometry-and-history.md#coordinates)). Fit selection avoids the zoom controls, a phone sheet and a tablet drawer.
- **Tests:** [`viewport.test.ts`](../../tests/unit/viewport.test.ts), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`canvas-gestures.test.tsx`](../../tests/component/canvas-gestures.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts), [`touch.spec.ts`](../../tests/e2e/touch.spec.ts).
- **Related ADRs:** [0004](../adr/0004-preview-gestures-outside-the-document.md), [0015](../adr/0015-responsive-editor-with-drawers-and-overflow-menu.md).
- **Accessibility:** zoom and fit stand in for free panning ([limitations](../../README.md#limitations)); the zoom value button announces the zoom.

## F-02 Selection and marquee

- **What:** a click selects a whole group, Alt-click one member, Shift-click toggles; a drag on empty canvas draws a marquee.
- **Why:** almost every edit acts on a selection.
- **Where:** [`selection.ts`](../../src/core/selection.ts), [`editor.ts`](../../src/core/editor.ts), [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts), [`SelectionOverlay.tsx`](../../src/editor/SelectionOverlay.tsx).
- **How it works:** hit tests run topmost first in the item's local frame, with a 6 px tolerance for thin walls. The marquee takes items whose rotated bounds lie inside it, even when press, move and release share one frame ([input](../explanation/geometry-and-history.md#input)).
- **Tests:** [`selection.test.ts`](../../tests/unit/selection.test.ts), [`editor.test.ts`](../../tests/unit/editor.test.ts), [`canvas-gestures.test.tsx`](../../tests/component/canvas-gestures.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0002](../adr/0002-svg-instead-of-a-canvas-library.md), [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md).
- **Accessibility:** the outline (F-11) is the keyboard route; changes are announced ("Selected 4 items"); outlines carry a halo so they show on any fill.

## F-03 Move and snap

- **What:** drag the selection, snapping the grabbed item to the 10 cm grid, or nudge it with the arrows; Escape drops a drag.
- **Why:** exact, aligned positions.
- **Where:** [`transform.ts`](../../src/core/transform.ts), [`editor.ts`](../../src/core/editor.ts), [`history.ts`](../../src/core/history.ts), [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts), [`PlanCanvas.tsx`](../../src/editor/PlanCanvas.tsx).
- **How it works:** a drag is a preview committed once on release, or not at all if the document changed meanwhile; Escape calls the gesture's `abort()` and keeps the selection. Held arrows merge into one undo step ([history](../explanation/geometry-and-history.md#history-invertible-operations-not-snapshots)).
- **Tests:** [`transform.test.ts`](../../tests/unit/transform.test.ts), [`editor.test.ts`](../../tests/unit/editor.test.ts), [`history.test.ts`](../../tests/unit/history.test.ts), [`canvas-gestures.test.tsx`](../../tests/component/canvas-gestures.test.tsx), [`editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0004](../adr/0004-preview-gestures-outside-the-document.md), [0009](../adr/0009-editor-enforces-file-format-limits.md).
- **Accessibility:** the live region gives the result ("Nudge 1 item. Desk 3 at 120, 340 cm.").

## F-04 Resize and rotate

- **What:** eight resize handles and a rotate knob on one selected item ([modifiers](keyboard.md#pointer)).
- **Why:** rooms and walls come in many sizes and angles.
- **Where:** [`transform.ts`](../../src/core/transform.ts), [`SelectionOverlay.tsx`](../../src/editor/SelectionOverlay.tsx), [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts).
- **How it works:** the opposite corner stays fixed even on a rotated item ([coordinates](../explanation/geometry-and-history.md#coordinates)), and sizes never drop below the kind's minimum. Rotation is the pointer's angle about the centre, up being 0°. Cursors turn with the item.
- **Tests:** [`transform.test.ts`](../../tests/unit/transform.test.ts), [`canvas-gestures.test.tsx`](../../tests/component/canvas-gestures.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0005](../adr/0005-centre-anchored-items-and-degrees.md).
- **Accessibility:** the inspector (F-12) and `[` `]` (F-07) make the same edits.

## F-05 Add tools

- **What:** add a desk, meeting room, lounge, planter or wall from the toolbar or its key, snapped at the view centre and named with the next free number.
- **Why:** a floor starts with placing items.
- **Where:** [`catalog.ts`](../../src/core/catalog.ts), [`editor.ts`](../../src/core/editor.ts), [`Toolbar.tsx`](../../src/editor/Toolbar.tsx), [`keymap.ts`](../../src/core/keymap.ts).
- **How it works:** `KIND_SPECS` gives each kind a shape, sizes and a key. Ids follow the [id rule](../explanation/geometry-and-history.md#ids-for-new-items). Past 10,000 items adding is refused, with an announcement.
- **Tests:** [`editor.test.ts`](../../tests/unit/editor.test.ts), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0009](../adr/0009-editor-enforces-file-format-limits.md), [0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md).
- **Accessibility:** buttons expose their letter with `aria-keyshortcuts`. New kinds: [add-an-item-kind.md](../how-to/add-an-item-kind.md).

## F-06 Duplicate, copy, cut and paste

- **What:** duplicate, copy, cut and paste ([keys](keyboard.md#keyboard)).
- **Why:** desk pods repeat.
- **Where:** [`editor.ts`](../../src/core/editor.ts), [`text.ts`](../../src/core/text.ts).
- **How it works:** the clipboard survives replacing the plan. Each paste lands two grid steps further; a cut starts one step back, so its first paste lands in place. Copies get numbered names ("Desk copy 2", never "copy copy"); groups with two or more copied members become new groups.
- **Tests:** [`editor.test.ts`](../../tests/unit/editor.test.ts), [`text.test.ts`](../../tests/unit/text.test.ts), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0009](../adr/0009-editor-enforces-file-format-limits.md).
- **Accessibility:** actions are announced ("Copied 4 items"), as is a refusal past the item limit.

## F-07 Align, distribute and rotate by steps

- **What:** align, distribute three or more items, or rotate by 15° (90° with Shift). The Arrange panel has two lines of four (left, centre, right, distribute horizontally; top, middle, bottom, distribute vertically), then rotate buttons.
- **Why:** tidy lines without measuring.
- **Where:** [`arrange.ts`](../../src/core/arrange.ts), [`ArrangePanel.tsx`](../../src/editor/ArrangePanel.tsx), [`editor.ts`](../../src/core/editor.ts).
- **How it works:** each action uses rotated bounds and is one history step; distribute keeps the outer items. A selection turns about the mean of its item centres, so a turn and its opposite cancel exactly ([arranging](../explanation/geometry-and-history.md#coordinates)).
- **Tests:** [`arrange.test.ts`](../../tests/unit/arrange.test.ts), [`editor.test.ts`](../../tests/unit/editor.test.ts), [`editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0011](../adr/0011-multi-selection-rotates-about-its-centre.md).
- **Accessibility:** icon buttons have names and titles; under three items distribute is `aria-disabled`, not hidden.

## F-08 Undo and redo

- **What:** keys and toolbar buttons; one step per gesture, up to 200, restoring the selection too.
- **Why:** experimenting is safe when every change can be taken back.
- **Where:** [`history.ts`](../../src/core/history.ts), [`editor.ts`](../../src/core/editor.ts), [`Toolbar.tsx`](../../src/editor/Toolbar.tsx).
- **How it works:** a change is a labelled list of invertible operations plus the selection before and after ([history](../explanation/geometry-and-history.md#history-invertible-operations-not-snapshots)).
- **Tests:** [`history.test.ts`](../../tests/unit/history.test.ts), [`editor.test.ts`](../../tests/unit/editor.test.ts), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0003](../adr/0003-history-as-invertible-operations.md), [0004](../adr/0004-preview-gestures-outside-the-document.md).
- **Accessibility:** the tooltip names the action ("Undo rename Larkspur room …") while the accessible name stays "Undo" or "Redo"; results are announced ("Undid: Move 4 items").

## F-09 Grouping and renaming

- **What:** group, ungroup, and rename a group, item or plan.
- **Why:** pods move as units, and names are how members find things.
- **Where:** [`editor.ts`](../../src/core/editor.ts), [`Inspector.tsx`](../../src/editor/Inspector.tsx), [`limits.ts`](../../src/core/limits.ts).
- **How it works:** new groups take the first free "Group N"; groups dissolve below two members. Names are trimmed and cut to 120 characters; blank or unchanged ones are ignored.
- **Tests:** [`editor.test.ts`](../../tests/unit/editor.test.ts), [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx).
- **Related ADRs:** [0009](../adr/0009-editor-enforces-file-format-limits.md).
- **Accessibility:** name fields are labelled, use `maxLength`, commit on Enter or blur and revert on Escape.

## F-10 Amenity tags and the tag brush

- **What:** five [amenities](keyboard.md#keyboard), each with its own glyph and colour, set by checkbox or painted with the brush (T, then 1–5).
- **Why:** members look for desks by amenity.
- **Where:** [`catalog.ts`](../../src/core/catalog.ts), [`editor.ts`](../../src/core/editor.ts), [`TagPalette.tsx`](../../src/editor/TagPalette.tsx), [`AmenityMark.tsx`](../../src/plan/AmenityMark.tsx).
- **How it works:** a stroke is one history step, and its first item decides whether it adds or removes the tag. On touch, one finger on empty canvas pans instead.
- **Tests:** [`editor.test.ts`](../../tests/unit/editor.test.ts), [`keymap.test.ts`](../../tests/unit/keymap.test.ts), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`canvas-gestures.test.tsx`](../../tests/component/canvas-gestures.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md).
- **Accessibility:** the palette is a native radio group; keyboard users tag with the checkboxes.

## F-11 Outline list box

- **What:** every item in a WAI-ARIA multi-select list box beside the canvas, or in a drawer on smaller screens ([keys](keyboard.md#outline-list-box)).
- **Why:** a keyboard and screen-reader way to choose any set of items.
- **Where:** [`OutlinePanel.tsx`](../../src/editor/OutlinePanel.tsx).
- **How it works:** focus moves by `aria-activedescendant`, apart from the selection, and follows canvas selections, scrolling the list but never the sidebar. Touch picks on click, so a swipe scrolls ([input](../explanation/geometry-and-history.md#input)).
- **Tests:** [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts), [`touch.spec.ts`](../../tests/e2e/touch.spec.ts).
- **Related ADRs:** [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md).
- **Accessibility:** arrows in the list never nudge items.

## F-12 Inspector and numeric fields

- **What:** name, X, Y, width, height, rotation and amenities for one item; group and arrange controls for several; the plan title for none ([keys](keyboard.md#inspector-number-fields)).
- **Why:** exact values, and keyboard editing of geometry.
- **Where:** [`Inspector.tsx`](../../src/editor/Inspector.tsx), [`NumberField.tsx`](../../src/editor/NumberField.tsx), [`editor.ts`](../../src/core/editor.ts).
- **How it works:** a field commits once, so typing "120" is one undo step. Non-numbers are refused with an error; values pass the gesture clamp, so sizes rise to the kind minimum.
- **Tests:** [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`editor.test.ts`](../../tests/unit/editor.test.ts).
- **Related ADRs:** [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md), [0009](../adr/0009-editor-enforces-file-format-limits.md).
- **Accessibility:** unit and error are linked by `aria-describedby`, with `aria-invalid`.

## F-13 Viewer with amenity highlighting

- **What:** `#/viewer` shows the saved plan read-only. Pressing an amenity dims the rest and counts matches; picking an item shows its details.
- **Why:** members find a desk without the editor.
- **Where:** [`ViewerPage.tsx`](../../src/viewer/ViewerPage.tsx), [`PlanViewer.tsx`](../../src/viewer/PlanViewer.tsx), [`PlanViewer.module.css`](../../src/viewer/PlanViewer.module.css).
- **How it works:** it shares the editor's validated loader; walls cannot be focused or picked. The wheel scrolls the page; Ctrl/⌘ + wheel or a two-finger pinch zooms. At the fitted view the canvas has `touch-action: pan-y` (`data-fitted`), so a vertical swipe scrolls the page; once zoomed or panned, one finger pans the plan.
- **Tests:** [`plan-viewer.test.tsx`](../../tests/component/plan-viewer.test.tsx), [`site.spec.ts`](../../tests/e2e/site.spec.ts), [`touch.spec.ts`](../../tests/e2e/touch.spec.ts).
- **Related ADRs:** [0002](../adr/0002-svg-instead-of-a-canvas-library.md), [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md).
- **Accessibility:** count and details are polite live regions; legend buttons use `aria-pressed`; a focused item is never dimmed.

## F-14 Embeddable `PlanViewer` component

- **What:** a controlled React component another app can render with its own plan, imported from this source (not a published package).
- **Why:** a co-working site could show the floor on its own pages.
- **Where:** [`PlanViewer.tsx`](../../src/viewer/PlanViewer.tsx), [`selection.ts`](../../src/core/selection.ts).
- **How it works:** it owns zoom and pan; the host owns selection and highlight.

  | Prop                | Type                                | Meaning                                                           |
  | ------------------- | ----------------------------------- | ----------------------------------------------------------------- |
  | `plan`              | `PlanDocument`                      | The plan to show; pass a validated document (`parseDocument`).    |
  | `highlight`         | `AmenityTag \| null`                | Amenity to emphasise; others are dimmed.                          |
  | `onHighlightChange` | `(tag: AmenityTag \| null) => void` | A legend button was pressed; null clears.                         |
  | `selectedId`        | `ItemId \| null`                    | The item shown as selected.                                       |
  | `onSelect`          | `(item: PlanItem \| null) => void`  | An item was clicked or activated; null for empty space or a wall. |

  Items are one Tab stop, which falls back to the first item when the remembered or host-selected id is missing; arrows follow `readingOrder` ([keys](keyboard.md#viewer)).

- **Tests:** [`plan-viewer.test.tsx`](../../tests/component/plan-viewer.test.tsx), [`selection.test.ts`](../../tests/unit/selection.test.ts), [`site.spec.ts`](../../tests/e2e/site.spec.ts).
- **Related ADRs:** [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md).
- **Accessibility:** items are `role="button"`, named with kind and amenities.

## F-15 Autosave and recovery

- **What:** edits save to `localStorage` 400 ms after the last change, and at once before navigation or when the page hides. The status bar reads "All changes saved", "Saving…", "Not saved: …" or "Not saved (storage unavailable)".
- **Why:** no data loss when storage is full, blocked or tampered with.
- **Where:** [`useEditor.ts`](../../src/editor/useEditor.ts), [`storage.ts`](../../src/core/storage.ts), [`planStore.ts`](../../src/shared/planStore.ts), [`App.tsx`](../../src/App.tsx).
- **How it works:** a plan is written only if the loader would accept it. An unreadable entry is copied to `floorplan-studio.plan.unreadable` before the demo loads ([loading at startup](../explanation/architecture.md#loading-at-startup)). Storage calls are wrapped, as private modes throw. When another tab saves, an alert says saving here replaces that version; the last save wins.
- **Tests:** [`seed-storage-culling.test.ts`](../../tests/unit/seed-storage-culling.test.ts), [`plan-store.test.ts`](../../tests/unit/plan-store.test.ts), [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts), [`site.spec.ts`](../../tests/e2e/site.spec.ts).
- **Related ADRs:** [0006](../adr/0006-validate-every-import-then-normalise.md), [0009](../adr/0009-editor-enforces-file-format-limits.md).
- **Accessibility:** save failures and the other-tab warning are alerts. Starting over: [reset-demo-data.md](../how-to/reset-demo-data.md).

## F-16 Import and export

- **What:** export as `<slug>.floorplan-studio.json`; import after a confirmation, as one undoable step.
- **Why:** moving plans and keeping backups, safe from untrusted files.
- **Where:** [`FileMenu.tsx`](../../src/editor/FileMenu.tsx), [`useFileActions.tsx`](../../src/editor/useFileActions.tsx), [`document.ts`](../../src/core/document.ts), [`limits.ts`](../../src/core/limits.ts).
- **How it works:** the slug is the title as lower-case a–z, 0–9 and hyphens, else `plan`. Size limit, rules, error list and the version 1 upgrade are in [file-format.md](file-format.md); the sequence is in [importing a file](../explanation/architecture.md#importing-a-file).
- **Tests:** [`document.test.ts`](../../tests/unit/document.test.ts), [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts).
- **Related ADRs:** [0005](../adr/0005-centre-anchored-items-and-degrees.md), [0006](../adr/0006-validate-every-import-then-normalise.md), [0014](../adr/0014-validate-migrated-files-against-current-schema.md).
- **Accessibility:** errors appear in a modal dialog focused on its button; a labelled button opens the file input.

## F-17 Presets, stress floor and culling

- **What:** load the demo, a 3,000-desk stress floor or a blank floor, after a confirmation, from the preset picker (wide windows) or **More tools**. Only items in view are drawn.
- **Why:** a realistic start, a performance check and a clean slate.
- **Where:** [`seed.ts`](../../src/core/seed.ts), [`useFileActions.tsx`](../../src/editor/useFileActions.tsx), [`culling.ts`](../../src/core/culling.ts), [`SelectionOverlay.tsx`](../../src/editor/SelectionOverlay.tsx).
- **How it works:** a seeded xorshift32 generator makes the stress floor identical each load. Culling ([rendering](../explanation/architecture.md#rendering)) caches rotated bounds per immutable item in a `WeakMap`. Selection outlines are culled too, and above 400 members only the group box is drawn.
- **Tests:** [`seed-storage-culling.test.ts`](../../tests/unit/seed-storage-culling.test.ts), [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts), [`touch.spec.ts`](../../tests/e2e/touch.spec.ts).
- **Related ADRs:** [0002](../adr/0002-svg-instead-of-a-canvas-library.md).
- **Accessibility:** picking an option does not load it; the Load button does (WCAG 3.2.2). Menu items still confirm.

## F-18 Shortcut help

- **What:** "?" on the canvas, the Shortcuts button or **More tools** → **Keyboard shortcuts** lists every shortcut and gesture.
- **Why:** discoverability from generated help.
- **Where:** [`ShortcutsDialog.tsx`](../../src/editor/ShortcutsDialog.tsx), [`ShortcutList.tsx`](../../src/shared/ShortcutList.tsx), [`keymap.ts`](../../src/core/keymap.ts), [`Dialog.tsx`](../../src/shared/Dialog.tsx).
- **How it works:** the dialog renders `KEYMAP` and `POINTER_HELP` inside a native `<dialog>`, which traps and restores focus and handles Escape.
- **Tests:** [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor-compact.test.tsx`](../../tests/component/editor-compact.test.tsx), [`keymap.test.ts`](../../tests/unit/keymap.test.ts), [`keyboard-reference.test.ts`](../../tests/unit/keyboard-reference.test.ts).
- **Related ADRs:** [0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md).
- **Accessibility:** the dialog explains "canvas focused" keys. Its body is a focusable region the keyboard can scroll; on a phone it scrolls between a fixed heading and Close button.

## F-19 Landing page and navigation

- **What:** an overview at `#/` linking to editor, viewer and shortcuts, under a header that marks the current page.
- **Why:** first-time visitors need a starting point.
- **Where:** [`LandingPage.tsx`](../../src/landing/LandingPage.tsx), [`AppHeader.tsx`](../../src/shared/AppHeader.tsx), [`App.tsx`](../../src/App.tsx), [`route.ts`](../../src/shared/route.ts).
- **How it works:** hash routes (`#/`, `#/editor`, `#/viewer`) work on any static host; each view sets the title, and navigation focuses `<main>`.
- **Tests:** [`route.test.ts`](../../tests/unit/route.test.ts), [`site.spec.ts`](../../tests/e2e/site.spec.ts).
- **Related ADRs:** none.
- **Accessibility:** `aria-current="page"` on the active link; the skip link keeps the route.

## F-20 Error boundary

- **What:** a view that fails to render becomes "Something went wrong" with a Reload button; the saved plan is untouched.
- **Why:** a blank page gives no way forward.
- **Where:** [`ErrorBoundary.tsx`](../../src/shared/ErrorBoundary.tsx), [`App.tsx`](../../src/App.tsx).
- **How it works:** one boundary per view, keyed by route, with fixed text; the error is never shown.
- **Tests:** [`editor-panels.test.tsx`](../../tests/component/editor-panels.test.tsx).
- **Related ADRs:** [0004](../adr/0004-preview-gestures-outside-the-document.md) (stale gestures are filtered first).
- **Accessibility:** `role="alert"` with a heading and a real button.

## F-21 Accessibility features

- **What:** the measures listed in [ACCESSIBILITY.md](../../ACCESSIBILITY.md#what-is-built-in), plus a canvas with `role="application"`, a role description and hidden help text.
- **Why:** the target is WCAG 2.2 AA.
- **Where:** [`App.tsx`](../../src/App.tsx), [`Button.tsx`](../../src/shared/Button.tsx), [`useRovingFocus.ts`](../../src/editor/useRovingFocus.ts), [`keymap.ts`](../../src/core/keymap.ts), [`pageHandlers.ts`](../../src/shared/pageHandlers.ts), [`base.css`](../../src/styles/base.css).
- **How it works:** a disabled `Button` uses `aria-disabled="true"` and ignores clicks, never the native attribute. Key scopes and the page-body fallback are in [ADR 0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md); handlers share one [page-level registry](../explanation/architecture.md#page-level-handlers); the audit is in [audit-accessibility.md](../how-to/audit-accessibility.md).
- **Tests:** [`editor-page.test.tsx`](../../tests/component/editor-page.test.tsx), [`editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx), [`editor.test.ts`](../../tests/unit/editor.test.ts), [`keymap.test.ts`](../../tests/unit/keymap.test.ts), [`page-handlers.test.ts`](../../tests/unit/page-handlers.test.ts), [`text.test.ts`](../../tests/unit/text.test.ts), [`plan-viewer.test.tsx`](../../tests/component/plan-viewer.test.tsx), [`editor.spec.ts`](../../tests/e2e/editor.spec.ts), [`site.spec.ts`](../../tests/e2e/site.spec.ts).
- **Related ADRs:** [0008](../adr/0008-listbox-and-inspector-as-keyboard-alternative.md), [0010](../adr/0010-one-keymap-with-canvas-scoped-keys.md).
- **Accessibility:** see [ACCESSIBILITY.md](../../ACCESSIBILITY.md).

## F-22 Themes

- **What:** light, dark or system, switched in the header and remembered.
- **Why:** comfort in different lighting.
- **Where:** [`useTheme.ts`](../../src/shared/useTheme.ts), [`AppHeader.tsx`](../../src/shared/AppHeader.tsx), [`tokens.css`](../../src/styles/tokens.css).
- **How it works:** the choice sets `data-theme` on `<html>`; "system" removes it so `prefers-color-scheme` applies. Stored values other than `light` and `dark` mean system.
- **Tests:** [`site.spec.ts`](../../tests/e2e/site.spec.ts).
- **Related ADRs:** [0002](../adr/0002-svg-instead-of-a-canvas-library.md) (plan colours share the tokens).
- **Accessibility:** the toggle names the theme and action ("Light theme. Switch theme").

## F-23 Responsive layout and touch

- **What:** four layouts; on phones and tablets the canvas fills the window, outline and inspector open from the bottom bar as drawers (side on tablets, a sheet on phones), and tools move into **Add** and **More tools**.
- **Why:** checking a plan while walking the floor.
- **Where:** [`useEditorLayout.ts`](../../src/editor/useEditorLayout.ts), [`EditorPage.tsx`](../../src/editor/EditorPage.tsx), [`DrawerPane.tsx`](../../src/editor/DrawerPane.tsx), [`MenuButton.tsx`](../../src/shared/MenuButton.tsx), [`useCanvasGestures.ts`](../../src/editor/useCanvasGestures.ts), [`tokens.css`](../../src/styles/tokens.css).
- **How it works:** layouts, drawers, breakpoint focus, targets and touch rules are in [ADR 0015](../adr/0015-responsive-editor-with-drawers-and-overflow-menu.md). Drawers overlay the canvas, so the camera stays. `MenuButton` also closes on an outside press.
- **Tests:** [`touch.spec.ts`](../../tests/e2e/touch.spec.ts), [`site.spec.ts`](../../tests/e2e/site.spec.ts), [`editor-compact.test.tsx`](../../tests/component/editor-compact.test.tsx), [`editor-focus.test.tsx`](../../tests/component/editor-focus.test.tsx).
- **Related ADRs:** [0015](../adr/0015-responsive-editor-with-drawers-and-overflow-menu.md).
- **Accessibility:** drawers use the disclosure pattern; `DrawerPane` focuses its heading unless focus is already inside, and closing returns focus to the toggle. Menus use the menu button pattern.
