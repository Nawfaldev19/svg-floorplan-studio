# Add an item kind

This guide adds a new kind of item, for example a `locker`. The type system points at every place that needs a value, because the per-kind tables are `Record<ItemKind, …>`.

1. **Name the kind.** Append it to `ITEM_KINDS` in [`src/core/types.ts`](../../src/core/types.ts). Order there is toolbar and help order. Adding a kind does not change the schema version: version 2 files without the new kind still load.

2. **Describe it in the catalogue.** Add an entry to `KIND_SPECS` in [`src/core/catalog.ts`](../../src/core/catalog.ts): `label`, `shape` (`rect` or `ellipse`), `defaultSize`, `minSize` (centimetres) and a single-letter `shortcut`. Pick a letter no other binding uses; the keymap test fails on duplicates.

3. **Give it an icon.** Add the kind to `KIND_ICONS` in [`src/editor/Toolbar.tsx`](../../src/editor/Toolbar.tsx) with a [Lucide](https://lucide.dev/icons/) icon. TypeScript fails until you do.

4. **Give it colours.** Add a class to `KIND_CLASS` in [`src/plan/PlanItemShape.tsx`](../../src/plan/PlanItemShape.tsx), a rule in [`src/plan/plan.module.css`](../../src/plan/plan.module.css) (copy `.planter` or `.desk`), and `--item-<kind>` and `--item-<kind>-stroke` tokens in all three theme blocks of [`src/styles/tokens.css`](../../src/styles/tokens.css) (light, dark by system preference, dark by choice). Check contrast of the fill against the label colour and of the stroke against the canvas (at least 3:1 for the outline).

5. **Update the keyboard reference.** The add shortcut appears in `KEYMAP` automatically. Run `npm run test:unit`: [`tests/unit/keyboard-reference.test.ts`](../../tests/unit/keyboard-reference.test.ts) fails until the "Add a …" line in [docs/reference/keyboard.md](../reference/keyboard.md) matches.

6. **Test it.** Add unit tests for anything kind-specific (for example a minimum size in `tests/unit/transform.test.ts`). Existing tests that count kinds or items in the demo plan should not change unless you also add the kind to [`src/core/seed.ts`](../../src/core/seed.ts).

7. **Document it.** Update [F-05 in the feature catalogue](../reference/features.md#f-05-add-tools), the [glossary](../reference/glossary.md) and the [file format](../reference/file-format.md) kind list, and add a `CHANGELOG.md` entry.

8. **Run the gate:** `npm run verify`.

## Expected result

The toolbar shows "Add locker", the letter adds one at the centre of the view while the canvas has focus, the help lists it, files with the kind import and export, and older files still load.
