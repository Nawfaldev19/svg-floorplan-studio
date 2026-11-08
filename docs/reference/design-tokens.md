# Design tokens and components

The design system is called Larkspur. Every colour, size, radius, shadow and timing is a CSS custom property in [`src/styles/tokens.css`](../../src/styles/tokens.css). Component styles are CSS modules beside their components and use only these tokens, apart from 1–2 px hairlines and a few fixed component widths.

## Theming

Light values sit on `:root`. The dark values appear twice with identical content: under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme='light'])`, and under `:root[data-theme='dark']` for the header's theme toggle ([`useTheme`](../../src/shared/useTheme.ts), [F-22](features.md#f-22-themes)); a unit test checks that the two blocks match. Plan colours (`--item-*`, `--amenity-*`) are tokens too, so the SVG plan follows the theme without script.

## Colour

Hex values. An "on" token is the text colour for the matching fill.

| Token                   | Light                 | Dark                    | Used for                                                                  |
| ----------------------- | --------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `--color-bg`            | `#faf7f2`             | `#111614`               | Page background, sidebar, drawers                                         |
| `--color-surface`       | `#ffffff`             | `#181e1b`               | Panels, fields, dialogs, the canvas, the selection halo                   |
| `--color-sunken`        | `#f2eee6`             | `#0c100e`               | Hover backgrounds, the outline count badge, notices                       |
| `--color-text`          | `#1c2321`             | `#e9eeea`               | Body text, item labels                                                    |
| `--color-text-muted`    | `#56605b`             | `#a2ada7`               | Hints, units, status bar, outline metadata                                |
| `--color-border`        | `#dcd6cb`             | `#2c3531`               | Decorative dividers and card edges, never the only cue for a control      |
| `--color-border-strong` | `#857e73`             | `#68736d`               | Borders that identify controls: fields, selects, secondary buttons, chips |
| `--color-primary`       | `#2d6a4f`             | `#74c69d`               | Primary buttons, the skip link, links, pressed and selected indicators    |
| `--color-on-primary`    | `#ffffff`             | `#0b1f15`               | Text on primary                                                           |
| `--color-primary-soft`  | `#dcebe3`             | `#1d3a2c`               | Pressed buttons, open toggles, selected options, the kind pill            |
| `--color-accent`        | `#9a4614`             | `#f0a46b`               | Landing eyebrow, current-page underline, emphasised (picked) item outline |
| `--color-danger`        | `#b42318`             | `#f97066`               | Save and field errors, the danger button                                  |
| `--color-on-danger`     | `#ffffff`             | `#1c0b09`               | Text on danger                                                            |
| `--color-focus`         | `#7a4fd6`             | `#b79cff`               | Focus rings, selection outlines, handles, the marquee                     |
| `--color-grid`          | `rgb(28 35 33 / 7%)`  | `rgb(233 238 234 / 6%)` | Survey grid, landing dot pattern (decorative)                             |
| `--color-overlay`       | `rgb(17 22 20 / 45%)` | `rgb(0 0 0 / 60%)`      | Dialog backdrop                                                           |

### Plan palette

Each item kind has a fill and an outline (`-stroke`). Each amenity has a colour and a glyph shape ([`catalog.ts`](../../src/core/catalog.ts)), so it never relies on colour alone (WCAG 1.4.1).

| Token                                                | Light                 | Dark                  |
| ---------------------------------------------------- | --------------------- | --------------------- |
| `--item-desk` / `--item-desk-stroke`                 | `#e8dcc7` / `#8a6d45` | `#3a3226` / `#c9a875` |
| `--item-meeting-room` / `--item-meeting-room-stroke` | `#dcebe3` / `#2d6a4f` | `#1d3a2c` / `#74c69d` |
| `--item-lounge` / `--item-lounge-stroke`             | `#f4e1d2` / `#9a4614` | `#3d2a1d` / `#f0a46b` |
| `--item-planter` / `--item-planter-stroke`           | `#cfe5c4` / `#3d7a3a` | `#23391f` / `#8fcf86` |
| `--item-wall` / `--item-wall-stroke`                 | `#4a514e` / `#2b302e` | `#a2ada7` / `#e9eeea` |
| `--amenity-standing` (standing desk, triangle)       | `#2b5c8a`             | `#7db4e6`             |
| `--amenity-dual-monitor` (dual monitor, square)      | `#7a4fd6`             | `#b79cff`             |
| `--amenity-quiet` (quiet area, circle)               | `#2d6a4f`             | `#74c69d`             |
| `--amenity-window` (by a window, diamond)            | `#946400`             | `#f5b94a`             |
| `--amenity-step-free` (step-free access, plus)       | `#b42318`             | `#f97066`             |

## Contrast

Ratios use the WCAG 2.x relative-luminance formula on the `tokens.css` values; each pair is a foreground the UI draws on that background, as listed under "Used for" above. [`tests/unit/design-tokens.test.ts`](../../tests/unit/design-tokens.test.ts) recomputes every pair and fails if one drops below 4.5:1 for text (1.4.3) or 3:1 for interface components and graphics (1.4.11). All pass in both themes. For the automated audit of whole pages, see [Audit accessibility with axe-core](../how-to/audit-accessibility.md).

Left out on purpose: disabled controls (45 % opacity; WCAG exempts inactive components), viewer items dimmed to 22 % outside an active highlight (the highlighted items and the match count carry the information), the decorative grid and `--color-border` dividers.

#### Text (needs 4.5:1)

| Pair                                           | Light   | Dark    |
| ---------------------------------------------- | ------- | ------- |
| `--color-text` on `--color-bg`                 | 14.98:1 | 15.57:1 |
| `--color-text` on `--color-surface`            | 16.01:1 | 14.42:1 |
| `--color-text` on `--color-sunken`             | 13.83:1 | 16.31:1 |
| `--color-text` on `--color-primary-soft`       | 12.99:1 | 10.56:1 |
| `--color-text-muted` on `--color-bg`           | 6.10:1  | 7.90:1  |
| `--color-text-muted` on `--color-surface`      | 6.52:1  | 7.31:1  |
| `--color-text-muted` on `--color-primary-soft` | 5.29:1  | 5.36:1  |
| `--color-primary` on `--color-bg`              | 5.98:1  | 8.97:1  |
| `--color-primary` on `--color-surface`         | 6.39:1  | 8.31:1  |
| `--color-on-primary` on `--color-primary`      | 6.39:1  | 8.44:1  |
| `--color-on-danger` on `--color-danger`        | 6.57:1  | 6.84:1  |
| `--color-danger` on `--color-surface`          | 6.57:1  | 6.08:1  |
| `--color-accent` on `--color-bg`               | 6.03:1  | 8.90:1  |
| `--color-text` on `--item-desk`                | 11.81:1 | 10.75:1 |
| `--color-text` on `--item-meeting-room`        | 12.99:1 | 10.56:1 |
| `--color-text` on `--item-lounge`              | 12.61:1 | 11.56:1 |
| `--color-text` on `--item-planter`             | 11.94:1 | 10.67:1 |

#### Interface components and graphics (needs 3:1)

`--color-primary` on `--color-surface` (pressed and selected indicators) and `--color-accent` on `--color-bg` (current-page underline) are also checked at 3:1; their ratios are in the text table.

| Pair                                              | Light  | Dark   |
| ------------------------------------------------- | ------ | ------ |
| `--color-border-strong` on `--color-surface`      | 4.02:1 | 3.44:1 |
| `--color-border-strong` on `--color-bg`           | 3.76:1 | 3.71:1 |
| `--color-focus` on `--color-surface`              | 5.36:1 | 7.43:1 |
| `--color-focus` on `--color-bg`                   | 5.02:1 | 8.02:1 |
| `--item-desk-stroke` on `--color-surface`         | 4.82:1 | 7.53:1 |
| `--item-meeting-room-stroke` on `--color-surface` | 6.39:1 | 8.31:1 |
| `--item-lounge-stroke` on `--color-surface`       | 6.44:1 | 8.25:1 |
| `--item-planter-stroke` on `--color-surface`      | 5.19:1 | 9.22:1 |
| `--item-wall` on `--color-surface`                | 8.15:1 | 7.31:1 |
| `--color-accent` on `--item-desk`                 | 4.75:1 | 6.15:1 |
| `--color-focus` on `--item-desk`                  | 3.96:1 | 5.54:1 |
| `--color-focus` on `--item-meeting-room`          | 4.35:1 | 5.44:1 |

#### Amenity glyphs on fills (needs 3:1; light / dark)

| Amenity                  | `--color-surface` | `--item-desk` | `--item-meeting-room` | `--item-lounge` | `--item-planter` |
| ------------------------ | ----------------- | ------------- | --------------------- | --------------- | ---------------- |
| `--amenity-standing`     | 7.00 / 7.69       | 5.16 / 5.73   | 5.68 / 5.63           | 5.51 / 6.17     | 5.22 / 5.69      |
| `--amenity-dual-monitor` | 5.36 / 7.43       | 3.96 / 5.54   | 4.35 / 5.44           | 4.22 / 5.95     | 4.00 / 5.50      |
| `--amenity-quiet`        | 6.39 / 8.31       | 4.71 / 6.19   | 5.18 / 6.09           | 5.04 / 6.66     | 4.76 / 6.15      |
| `--amenity-window`       | 5.14 / 9.61       | 3.80 / 7.16   | 4.17 / 7.04           | 4.05 / 7.70     | 3.84 / 7.11      |
| `--amenity-step-free`    | 6.57 / 6.08       | 4.85 / 4.53   | 5.33 / 4.45           | 5.18 / 4.87     | 4.90 / 4.50      |

## Type

All three families are self-hosted ([THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)):

- `--font-display`, Bricolage Grotesque Variable: `h1`–`h4`, the brand, the brush palette legend.
- `--font-body`, Atkinson Hyperlegible (designed for legibility at small sizes): everything else, plan labels included.
- `--font-mono`, JetBrains Mono Variable: numeric fields, `kbd`, zoom readout, status bar, error lists.

Line height is 1.5 for body text (`--leading-body`, suits WCAG 1.4.12) and 1.15 for headings (`--leading-display`). Sizes form a major third (×1.25) from 16 px, plus two small steps for dense panels:

| Token         | Value             | Used for                                          |
| ------------- | ----------------- | ------------------------------------------------- |
| `--text-xs`   | 0.75rem (12 px)   | Status bar, outline metadata, menu hints, units   |
| `--text-sm`   | 0.8125rem (13 px) | Inspector hints and field labels, landing eyebrow |
| `--text-md`   | 0.875rem (14 px)  | Buttons, panels, lists, dialogs                   |
| `--text-base` | 1rem (16 px)      | Body text, inspector subheadings                  |
| `--text-lg`   | 1.25rem (20 px)   | Panel and dialog headings, landing lede           |
| `--text-xl`   | 1.5625rem (25 px) | Landing headings, viewer title on phones          |
| `--text-2xl`  | 1.953rem (31 px)  | Viewer title, smallest landing hero size          |
| `--text-4xl`  | 3.052rem (49 px)  | Largest landing hero size (`clamp` with 6vw)      |

On touch screens text fields are at least 16 px, so mobile browsers do not zoom when one gains focus ([`base.css`](../../src/styles/base.css)).

## Spacing, size and radius

Spacing follows a 4 px grid: `--space-0-5` is 2 px (kind pill padding); `--space-1` to `--space-4` are 4, 8, 12 and 16 px (gaps and padding in controls and panels); `--space-6` and `--space-8` are 24 and 32 px (card and dialog padding, page gutters); `--space-12` and `--space-16` are 48 and 64 px (landing rhythm).

- `--header-height`, 56 px: the site header; views size to `100dvh` minus this.
- `--size-control`, 36 px, or 44 px under `(pointer: coarse)`: height of buttons, fields, selects, header links and chips, and width of icon-only buttons. On touch screens outline options, checkboxes and palette options use it too (WCAG 2.5.8; 2.5.5 on touch).
- `--size-control-large`, 44 px: landing calls to action.
- Radii: `--radius-control` 6 px (buttons, fields, menu items, options), `--radius-card` 10 px (cards, panels, menus, the outline list), `--radius-dialog` 16 px (dialogs, the phone sheet's top corners), `--radius-pill` 999 px (legend chips, the kind pill, count badges).

[`EditorPage.module.css`](../../src/editor/EditorPage.module.css) sets `--drawer-width` (`min(360px, 88%)`, tablet drawer) and `--sheet-height` (`min(62%, 560px)`, phone sheet) on the editor root. Breakpoints are in [ADR 0015](../adr/0015-responsive-editor-with-drawers-and-overflow-menu.md).

## Elevation and motion

| Token        | Light                     | Dark                          | Used for                                 |
| ------------ | ------------------------- | ----------------------------- | ---------------------------------------- |
| `--shadow-1` | 1 px soft shadow          | none                          | Landing cards, viewer details card       |
| `--shadow-2` | 4 px + 1 px soft shadows  | 1 px `--color-border` ring    | Zoom controls, brush palette, error card |
| `--shadow-3` | 16 px + 4 px soft shadows | 1 px ring + 16 px dark shadow | Dialogs, menus, drawers, the sheet       |

Light shadows are warm-tinted; dark mode uses rings, since shadows barely show on dark surfaces.

Durations, all eased by `--ease-standard` (`cubic-bezier(0.2, 0.8, 0.2, 1)`): `--duration-micro` 120 ms (hover and press feedback, menu fade, skip link), `--duration-standard` 200 ms (drawer and sheet slide, viewer dimming), `--duration-enter` 320 ms (dialog entrance, landing cards). Under `prefers-reduced-motion: reduce` all three become 0 ms and the drawer, sheet and menu animations are also switched off explicitly. Nothing in the app moves on its own.

## Focus and selection

- **Focus ring:** `:focus-visible` draws a 2 px `--color-focus` outline at a 2 px offset ([`base.css`](../../src/styles/base.css)); the offset is −2 px inside lists and menus, keeping the ring inside the scroll box, and −3 px on the canvas.
- **Selection halo:** canvas outlines are a 2 px `--color-focus` line over a 5 px `--color-surface` halo, both `vector-effect: non-scaling-stroke`, so they show on any fill, dark walls included ([`PlanCanvas.module.css`](../../src/editor/PlanCanvas.module.css)).
- **Handles:** 10 px squares with a 24 px invisible hit area (WCAG 2.5.8), sized in screen pixels at every zoom.
- **Programmatic focus targets** (`<main>` after navigation, a panel heading when its drawer opens) show no ring unless the browser treats the focus as keyboard-driven.

## Component inventory

Every component and hook has TSDoc on its export (including each prop) and a header comment naming the file's responsibility ([CONTRIBUTING.md → Code style](../../CONTRIBUTING.md#code-style)). Behaviour is described in the [feature catalogue](features.md).

### Shared (`src/shared`)

| Component                                                                                                                                                | Purpose and accessibility                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`AppHeader`](../../src/shared/AppHeader.tsx)                                                                                                            | Brand link, navigation, theme toggle. `nav` landmark, `aria-current="page"`; on phones the brand text is visually hidden but still names the link                                                                        |
| [`Button`](../../src/shared/Button.tsx)                                                                                                                  | `type="button"` by default; styles follow `aria-pressed` / `aria-expanded`; `disabled` sets `aria-disabled="true"` and ignores clicks, so the button keeps focus                                                         |
| [`MenuButton`](../../src/shared/MenuButton.tsx)                                                                                                          | The Add and More tools menus. WAI-ARIA menu button (`aria-haspopup`, `aria-expanded`, `aria-controls`); arrows, Home, End, Escape, Tab; disabled items stay focusable; focus returns to the button before an action runs |
| [`Dialog`](../../src/shared/Dialog.tsx)                                                                                                                  | Native modal `<dialog>` (focus trap, Escape, inert page, focus restored); focus starts on the safe choice; long bodies scroll between a fixed heading and actions; a `wide` body is a Tab stop                           |
| [`ErrorBoundary`](../../src/shared/ErrorBoundary.tsx)                                                                                                    | Replaces a crashed view with a plain-language message and a reload button; no internals shown                                                                                                                            |
| [`ShortcutList`](../../src/shared/ShortcutList.tsx)                                                                                                      | Every shortcut and gesture from `KEYMAP` and `POINTER_HELP`, as definition lists with `kbd`                                                                                                                              |
| [`useTheme`](../../src/shared/useTheme.ts), [`useMediaQuery`](../../src/shared/useMediaQuery.ts), [`useElementSize`](../../src/shared/useElementSize.ts) | Theme choice (follows the OS by default); live media-query match; element size                                                                                                                                           |
| [`pageHandlers`](../../src/shared/pageHandlers.ts)                                                                                                       | `subscribe` and `usePageHandler` share each `window` or `document` `on…` handler among subscribers                                                                                                                       |

### Plan drawing (`src/plan`)

| Component                                           | Purpose and accessibility                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`PlanItemShape`](../../src/plan/PlanItemShape.tsx) | One item in SVG for editor and viewer; labels cut only between words (2.5.3) |
| [`AmenityMark`](../../src/plan/AmenityMark.tsx)     | One amenity glyph                                                            |
| [`Swatch`](../../src/plan/Swatch.tsx)               | Legend-sized glyph, `aria-hidden`; the adjacent text names it                |
| [`GridBackdrop`](../../src/plan/GridBackdrop.tsx)   | One-metre survey grid, decorative                                            |
| [`useWheelZoom`](../../src/plan/useWheelZoom.ts)    | Wheel and trackpad zoom and pan; keys and buttons do the same                |

### Editor (`src/editor`)

| Component                                                                                                                                                                                                                    | Purpose and accessibility                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`EditorPage`](../../src/editor/EditorPage.tsx)                                                                                                                                                                              | Layout, camera, shortcuts, status bar. One keymap, character keys scoped to the canvas (2.1.4); polite live region; `data-layout` per window width                                                         |
| [`Toolbar`](../../src/editor/Toolbar.tsx)                                                                                                                                                                                    | Mode, add, history, selection and file tools. WAI-ARIA toolbar, one Tab stop; `aria-keyshortcuts`; tooltips on icon-only buttons                                                                           |
| [`FileMenu`](../../src/editor/FileMenu.tsx)                                                                                                                                                                                  | Wide-layout preset picker, Load, Import, Export; choosing a preset does not load it (3.2.2)                                                                                                                |
| [`useFileActions`](../../src/editor/useFileActions.tsx)                                                                                                                                                                      | Preset, import and export behaviour; asks before replacing the plan; lists errors in a dialog                                                                                                              |
| [`DrawerPane`](../../src/editor/DrawerPane.tsx)                                                                                                                                                                              | Sidebar panel, a drawer on phones and tablets; disclosure pattern with the status-bar toggles                                                                                                              |
| [`Inspector`](../../src/editor/Inspector.tsx)                                                                                                                                                                                | Name, geometry and amenities of one item, group and arrange controls. Labelled region; fields commit on Enter or blur                                                                                      |
| [`NumberField`](../../src/editor/NumberField.tsx)                                                                                                                                                                            | Numeric field; unit and error in `aria-describedby`; `aria-invalid`; arrow keys step                                                                                                                       |
| [`ArrangePanel`](../../src/editor/ArrangePanel.tsx)                                                                                                                                                                          | With two or more selected, two lines of four (align left, centre, right, distribute horizontally; top, middle, bottom, distribute vertically); then rotate buttons. Named icon buttons in a labelled group |
| [`OutlinePanel`](../../src/editor/OutlinePanel.tsx)                                                                                                                                                                          | Multi-select listbox of every item with `aria-activedescendant`; scrolls only itself                                                                                                                       |
| [`TagPalette`](../../src/editor/TagPalette.tsx)                                                                                                                                                                              | The brush's amenity: radio group in a `fieldset`, keys 1–5                                                                                                                                                 |
| [`PlanCanvas`](../../src/editor/PlanCanvas.tsx)                                                                                                                                                                              | The editable SVG; `role="application"` with a role description and hidden help text                                                                                                                        |
| [`SelectionOverlay`](../../src/editor/SelectionOverlay.tsx)                                                                                                                                                                  | Outlines, resize handles, rotate knob                                                                                                                                                                      |
| [`ShortcutsDialog`](../../src/editor/ShortcutsDialog.tsx)                                                                                                                                                                    | The "?" help, built on `Dialog` and `ShortcutList`                                                                                                                                                         |
| [`useCanvasGestures`](../../src/editor/useCanvasGestures.ts), [`useEditor`](../../src/editor/useEditor.ts), [`useEditorLayout`](../../src/editor/useEditorLayout.ts), [`useRovingFocus`](../../src/editor/useRovingFocus.ts) | Pointer and touch gestures; reducer and autosave; layout by width; toolbar roving tabindex, which includes `aria-disabled` controls                                                                        |

### Viewer and landing

| Component                                          | Purpose and accessibility                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`PlanViewer`](../../src/viewer/PlanViewer.tsx)    | Embeddable read-only plan with amenity highlighting. Items are one Tab stop with arrow keys; legend chips are toggle buttons; match count in a live region |
| [`ViewerPage`](../../src/viewer/ViewerPage.tsx)    | Hosts `PlanViewer` with the saved plan and a details panel in a polite live region                                                                         |
| [`LandingPage`](../../src/landing/LandingPage.tsx) | Overview linking both views and the shortcut list; single `h1`; cards are a labelled list                                                                  |
