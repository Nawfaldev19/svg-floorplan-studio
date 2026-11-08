# Getting started

In about fifteen minutes you will run Floorplan Studio, add and arrange desks with the mouse and with the keyboard alone, tag them, and see the result in the read-only viewer. No account or server is involved.

## 1. Run the app

You need Node.js 22.12+ or 24+ (CI uses the version in `.nvmrc`). Clone the repository, then in its folder:

```bash
npm ci
npm run dev
```

Open <http://localhost:5173> in a browser window at least 1280 px wide; at that width every tool is on the toolbar and the outline sits beside the canvas. (Narrower windows move tools into the **Add** and **More tools** menus and the panels into drawers.) **Expected:** the overview page, headed "Lay out a floor. Share it read-only."

## 2. Open the editor

Choose **Open the editor**. **Expected:** the demo floor, "Larkspur Commons, level 2", fitted to the canvas, with the outline on the right listing 51 items and the status bar saying "51 items · 0 selected".

## 3. Add and move a desk with the pointer

1. Press **Add desk** in the toolbar. A desk appears in the centre of the view, selected, named with the next free number.
2. Drag it. It snaps to the 10 cm grid; hold Alt to move it freely.
3. Drag the square handle on its right edge to make it wider, and the round knob above it to turn it (hold Shift for 15° steps).

**Expected:** the inspector shows the new X, Y, width and rotation, and the Undo button's tooltip names your last action.

## 4. Do the same with the keyboard only

1. Press Tab until the canvas has focus (it is labelled with the plan title).
2. Press **D**. A new desk is added and selected.
3. Press the arrow keys to nudge it by one grid step, Shift + arrow for five. A run of presses close together is one undo step.
4. Press **]** twice to turn it 30° clockwise.
5. Press **?** to see every shortcut, then Esc.

**Expected:** after each step the status line at the bottom says where the desk ended up, for example "Nudge 1 item. Desk 32 at …, … cm." with the new position. Screen readers announce the same text.

## 5. Choose several items from the outline

1. Tab to the outline list.
2. Press Down to move through the items. Hold Ctrl (⌘ on a Mac) and press Down to move without selecting, then Space to add an item to the selection.
3. In the inspector, press **Align top edges**.

**Expected:** the selected items line up; the change is one undo step (Ctrl/⌘ Z).

## 6. Tag desks with the brush

1. Press **Tag brush** in the toolbar (or T on the canvas).
2. Choose **Dual monitor** in the palette.
3. Drag across a few desks.

**Expected:** the desks gain the square dual-monitor mark. Dragging again starting on a tagged desk removes the tag. Press Esc to leave the brush.

## 7. See it in the viewer

Choose **Viewer** in the header. Press **Dual monitor** in the legend.

**Expected:** every other item is dimmed and the summary says how many items offer it. Click a desk, or Tab to the plan, use the arrow keys and press Enter, to see its details.

## 8. Keep a copy

Back in the editor, press **Export**. **Expected:** a file named `larkspur-commons-level-2.floorplan-studio.json`. Choose **Blank floor** in the preset picker and press **Load preset**, then **Import** that file to bring the plan back.

## Where next

- Every feature, with its code and tests: [reference/features.md](../reference/features.md).
- All shortcuts: [reference/keyboard.md](../reference/keyboard.md).
- How it works: [explanation/architecture.md](../explanation/architecture.md).
- Start over: [how-to/reset-demo-data.md](../how-to/reset-demo-data.md).
