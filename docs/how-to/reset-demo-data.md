# Reset the demo data

Plans live only in this browser's `localStorage`, under three keys:

| Key                                | Holds                                               |
| ---------------------------------- | --------------------------------------------------- |
| `floorplan-studio.plan`            | The autosaved plan                                  |
| `floorplan-studio.plan.unreadable` | A saved plan that could not be read, kept as a copy |
| `floorplan-studio.theme`           | `light` or `dark`, when chosen                      |

## From the app (undoable)

1. Open the editor (`#/editor`).
2. In the preset picker choose **Demo floor** (or **Blank floor**), then press **Load preset**.
3. Confirm **Replace plan**. The status bar shows "All changes saved" shortly after.

This is one undo step: Ctrl/⌘ Z brings the previous plan back during the session.

## Clearing storage completely

In the browser's developer tools, open Application (Chrome, Edge) or Storage (Firefox, Safari) → Local Storage → the app's origin, and delete the keys above. Reload: the demo plan loads. Export the plan first if you want to keep it.

## Recovering an unreadable plan

If the app said "Your saved plan could not be read", the original text is in `floorplan-studio.plan.unreadable`. Copy its value into a file, fix it with the rules in [file-format.md](../reference/file-format.md), and import it.
