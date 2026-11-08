/**
 * Selection rules: group expansion, topmost-item hit testing, marquee
 * containment, Shift-toggling and the viewer's keyboard reading order. Pure
 * functions over a document.
 *
 * @packageDocumentation
 */
import {
  boundsOf,
  boxContainsBox,
  itemContainsPoint,
  unionOf,
  type Box,
  type Point,
} from './geometry';
import type { ItemId, PlanDocument, PlanItem } from './types';

/** Adds every member of any group touched by `ids`, keeping the original order first. */
export function expandToGroups(doc: PlanDocument, ids: readonly ItemId[]): ItemId[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const item of doc.items) {
    if (wanted.has(item.id) && item.groupId) groups.add(item.groupId);
  }
  if (groups.size === 0) return [...wanted];
  const result = [...wanted];
  for (const item of doc.items) {
    if (item.groupId && groups.has(item.groupId) && !wanted.has(item.id)) result.push(item.id);
  }
  return result;
}

/** Topmost item under the point. `tolerance` is in world units. */
export function hitTest(doc: PlanDocument, world: Point, tolerance = 0): PlanItem | null {
  for (let i = doc.items.length - 1; i >= 0; i -= 1) {
    const item = doc.items[i];
    if (item && itemContainsPoint(item, world, tolerance)) return item;
  }
  return null;
}

/** Items whose rotated bounds sit fully inside the marquee box. */
export function itemsInsideBox(doc: PlanDocument, box: Box): ItemId[] {
  return doc.items.filter((item) => boxContainsBox(box, boundsOf(item))).map((item) => item.id);
}

function itemsById(doc: PlanDocument, ids: readonly ItemId[]): PlanItem[] {
  const wanted = new Set(ids);
  return doc.items.filter((item) => wanted.has(item.id));
}

/** The overall rotated bounds of the given items, or null when none of them exist. */
export function selectionBounds(doc: PlanDocument, ids: readonly ItemId[]): Box | null {
  return unionOf(itemsById(doc, ids).map(boundsOf));
}

/**
 * Toggles one id; when it belongs to a group the whole group toggles together.
 *
 * @param exact - Toggle only `id`, ignoring its group (Alt+Shift+click, the outline).
 * @returns The new selection, keeping the existing order.
 */
export function toggleInSelection(
  doc: PlanDocument,
  selection: readonly ItemId[],
  id: ItemId,
  exact: boolean,
): ItemId[] {
  const unit = exact ? [id] : expandToGroups(doc, [id]);
  const current = new Set(selection);
  if (current.has(id)) {
    for (const member of unit) current.delete(member);
    return selection.filter((s) => current.has(s));
  }
  return [...selection, ...unit.filter((member) => !current.has(member))];
}

/** Height of one line of reading order, in centimetres. */
const READING_LINE_CM = 40;

/**
 * Reading order for keyboard navigation: lines of {@link READING_LINE_CM}
 * from top to bottom, each read left to right.
 *
 * @remarks
 * Items are put on a line first and then sorted by (line, x, y, id). Comparing
 * "y differs by more than 40 cm" pairwise instead would not be transitive, so
 * the order could change between sorts.
 */
export function readingOrder(items: readonly PlanItem[]): PlanItem[] {
  const line = (item: PlanItem) => Math.floor(item.y / READING_LINE_CM);
  return items
    .filter((item) => item.kind !== 'wall')
    .sort(
      (a, b) =>
        line(a) - line(b) || a.x - b.x || a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}
