# Accessibility

Floorplan Studio targets **WCAG 2.2 level AA** and follows the **WAI-ARIA Authoring Practices** for its widgets. This page says what was built and checked; it is not a conformance claim. Each entry in the [feature catalogue](docs/reference/features.md) has its own accessibility notes.

## What is built in

- **Keyboard access to everything the pointer does**, with the two exceptions under known limitations. Items are chosen in an outline list box (WAI-ARIA multi-select), edited in labelled numeric fields, and nudged and rotated with keys; the viewer's items are one Tab stop with arrow keys ([ADR 0008](docs/adr/0008-listbox-and-inspector-as-keyboard-alternative.md), [all keys](docs/reference/keyboard.md)).
- **Shortcuts scoped to focus** (2.1.4): character keys and arrows act only on the canvas, and Delete only on the canvas or the outline, so nothing fires from a button or field ([ADR 0010](docs/adr/0010-one-keymap-with-canvas-scoped-keys.md)).
- **Focus that never gets lost.** Unavailable controls are marked `aria-disabled` and stay focusable, so pressing Undo until the history is empty leaves focus on Undo. Narrowing the window while a panel has focus opens that panel's drawer instead of hiding the control. If focus does fall to the page body, the editor still takes its shortcuts. A skip link, focus on the new view after navigation, page titles (2.4.2), a one-stop toolbar, native `<dialog>` elements and visible focus rings (2.4.7) complete it.
- **Status messages** (4.1.3): a polite live region says what happened and where things ended up ("Nudge 1 item. Desk 3 at 120, 340 cm."); a failed save, or another tab saving the same plan, raises an alert.
- **Not by colour alone** (1.4.1): every amenity has its own glyph shape.
- **Label in Name** (2.5.3): plan labels are shortened only between words, so the drawn label is always the start of the accessible name.
- **Target size** (2.5.8, and 2.5.5 on touch screens): controls are 36 px with a mouse and 44 px on touch screens; resize and rotate handles have a 24 px hit area.
- **Reflow and touch** (1.4.10): below 1024 px the canvas fills the window and the panels become drawers with disclosure toggles; tools that do not fit move into menu buttons ([ADR 0015](docs/adr/0015-responsive-editor-with-drawers-and-overflow-menu.md)).
- **On input** (3.2.2): choosing a preset does not load it; the Load button does.
- **Reduced motion and themes:** animations stop under `prefers-reduced-motion: reduce`; light and dark themes follow the system by default.

## How it was checked

- **Automated audit:** axe-core against the production build in 32 page states (desktop, phone and tablet widths, both themes), reproducible with [docs/how-to/audit-accessibility.md](docs/how-to/audit-accessibility.md). Last run 2026-10-18: 0 violations.
- **Keyboard and focus tests:** component and end-to-end tests drive the editor and viewer from the keyboard alone and check focus after every disabling action and layout change ([traceability](docs/testing/traceability.md)).
- **Names and roles:** the tests find controls by role and accessible name, so a missing name fails them.
- **Contrast:** [`tests/unit/design-tokens.test.ts`](tests/unit/design-tokens.test.ts) recomputes the WCAG ratio of every colour pair listed in [design-tokens.md](docs/reference/design-tokens.md), in both themes, against 4.5:1 for text and 3:1 for other content.
- **Responsive and touch:** end-to-end tests on emulated phone and tablet viewports with synthesized touch input, including a check that no view scrolls sideways.

**Not done:** manual testing with screen readers (VoiceOver, NVDA, JAWS, TalkBack), speech input, physical devices, or forced-colours modes.

## Known limitations

- The marquee and free panning of the editor canvas have no direct keyboard twin; the outline's multi-select and zoom or fit cover the same needs.
- Touch is tested in emulation only.
- Resize handles keep a 24 px hit area on touch screens (2.5.8, not 2.5.5), because a larger one would cover small items; the inspector's numeric fields resize precisely.
- The outline lists every item without windowing, so on very large plans a screen reader announces a long list.
- Canvas labels are shortened or left out at low zoom; the full name is in the outline, the inspector and the accessible name.
- English only.

## Report a barrier

Open an issue with the bug report form and say which input method you use, what you tried, what you expected, and your browser and assistive technology. To report privately, use the contact details on the maintainer's GitHub profile. Barriers are treated as bugs.
