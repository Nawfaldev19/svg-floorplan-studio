# Plan file format

The JSON written by **Export** and autosave, and read by **Import** and at startup. The text is indented by two spaces, with no extra metadata. Export names the file `<slug>.floorplan-studio.json`: the lower-cased title reduced to `a–z`, `0–9` and single hyphens, or `plan` if nothing is left.

The rules are a Zod schema that drops unknown keys, in [`src/core/document.ts`](../../src/core/document.ts); the types are in [`src/core/types.ts`](../../src/core/types.ts) and the limits in [`src/core/limits.ts`](../../src/core/limits.ts). Decisions: [ADR 0006](../adr/0006-validate-every-import-then-normalise.md), [ADR 0014](../adr/0014-validate-migrated-files-against-current-schema.md).

## Version 2 (current)

```json
{
  "schemaVersion": 2,
  "title": "Larkspur Commons, level 2",
  "gridSize": 10,
  "items": [
    {
      "id": "item-10",
      "kind": "desk",
      "name": "Fern desk 1",
      "x": 1215,
      "y": 275,
      "width": 160,
      "height": 80,
      "rotation": 0,
      "tags": ["window", "standing"],
      "groupId": "group-9"
    }
  ],
  "groups": [{ "id": "group-9", "name": "Fern pod" }]
}
```

| Field                     | Type           | Rule                                                                                                                                |
| ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`           | `2`            | Required; picks the schema.                                                                                                         |
| `title`                   | string         | Trimmed, at most 120 characters.                                                                                                    |
| `gridSize`                | number         | From 1 (`MIN_GRID_SIZE`) to 500 (`MAX_GRID_SIZE`) cm.                                                                               |
| `items`                   | array          | At most 10,000 entries.                                                                                                             |
| `items[].id`              | string         | 1 to 64 of `A–Z a–z 0–9 - _`; unique within the plan.                                                                               |
| `items[].kind`            | enum           | `desk`, `meetingRoom`, `lounge`, `planter`, `wall`.                                                                                 |
| `items[].name`            | string         | Trimmed, at most 120 characters.                                                                                                    |
| `items[].x`, `y`          | number         | Centre, finite, within ±1,000,000 cm.                                                                                               |
| `items[].width`, `height` | number         | Greater than 0, at most 1,000,000 cm; raised to the kind's minimum, with a note.                                                    |
| `items[].rotation`        | number         | Clockwise degrees, finite; wrapped into [0, 360).                                                                                   |
| `items[].tags`            | array of enum  | Up to 20 of `standing`, `dualMonitor`, `quiet`, `window`, `stepFree`; duplicates removed, so one of each remains.                   |
| `items[].groupId`         | string or null | Same pattern as ids; must name a group in `groups`.                                                                                 |
| `groups`                  | array          | At most 10,000 entries. Ids are unique and may not equal an item id. Groups with fewer than two members are dissolved, with a note. |

A file that fails leaves the current plan untouched; the error dialog lists up to eight problems with their paths (for example `items.0.kind: Invalid option: expected one of "desk"|"meetingRoom"|…` or `groups: id "x" is also an item id`) and how many more there were.

## Version 1 (read only)

An earlier layout the importer still accepts and upgrades: `name` instead of `title`, items with `label`, a top-left anchor (`left`, `top`), `w`, `h`, rotation in radians (`angleRad`) and optional `amenities`. It has no groups or grid size; the grid becomes 10 cm. The migrated result is checked against the version 2 rules, and errors from that check start with "after upgrading from version 1,".

## Before parsing

A file over 8 MB (`MAX_IMPORT_BYTES`) is refused on its size alone and never read. Text that is not JSON, has no `schemaVersion`, or names a version other than 1 or 2 is refused with one explanatory error.
