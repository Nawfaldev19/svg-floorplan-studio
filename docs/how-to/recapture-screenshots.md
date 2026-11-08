# Recapture the screenshots

The README images live in [`docs/assets/`](../assets/). Keep each file under 400 KB; at the sizes below they are 90–300 KB as PNG.

Start from the demo floor (see [reset-demo-data.md](reset-demo-data.md)) so the images match the documentation, and run the production build (`npm run build && npm run preview`, then open `http://localhost:4173`), which has no development overlays.

| File                         | Window                                        | State                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor-desktop-light.png`   | 1440 × 900 at 2× pixel density, light theme   | `#/editor` on the demo floor; click **Clover desk 1** so its pod of four is selected; press **Fit selection**, then **Zoom out** until the readout shows 60% (desk labels are drawn from about 40%); move focus off the canvas. |
| `editor-desktop-dark.png`    | Same, dark theme                              | Same state.                                                                                                                                                                                                                     |
| `viewer-highlight.png`       | 1440 × 900 at 2×, light theme                 | `#/viewer`; press **Standing desk**; Tab to the plan, move to **Clover desk 1** and press Enter so its details show.                                                                                                            |
| `editor-phone-inspector.png` | 390 × 844 at 2×, touch emulation, light theme | `#/editor`; tap **Clover desk 1**; tap **Inspector** in the bottom bar; tap **Fit selection** so the pod sits above the zoom controls; scroll the sheet until **Group of 4** is at its top, so the Arrange tools show.          |

In Chromium's device toolbar (DevTools → Toggle device toolbar) you can set the size, the pixel ratio and touch emulation, and save with **Capture screenshot**.
