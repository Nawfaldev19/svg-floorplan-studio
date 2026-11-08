/**
 * Viewport culling: which items intersect the visible area, with rotated
 * bounds cached per immutable item, and fitting the camera to a set of items.
 *
 * @packageDocumentation
 */
import { boundsOf, boxesIntersect, unionOf, type Box } from './geometry';
import type { ItemId, PlanItem } from './types';
import { fitBox, IDENTITY_VIEWPORT, type Size, type Viewport } from './viewport';

// Items are immutable, so a bounds cache keyed by object identity can never go stale.
const boundsCache = new WeakMap<PlanItem, Box>();

/**
 * The item's rotated bounding box, computed once per item object.
 *
 * @remarks
 * Safe without invalidation because items are never mutated: an edit creates
 * a new object, which misses the cache, and the old one is garbage-collected
 * together with its entry.
 */
export function cachedBounds(item: PlanItem): Box {
  let box = boundsCache.get(item);
  if (!box) {
    box = boundsOf(item);
    boundsCache.set(item, box);
  }
  return box;
}

/**
 * Items whose rotated bounds intersect the visible box, in paint order. `keep`
 * is drawn even when it is off screen, so a focused item never leaves the DOM.
 *
 * @param items - Every item in paint order.
 * @param visible - The visible world box, usually from `visibleWorldBox`.
 * @param keep - An item to include regardless, such as the viewer's focused item.
 * @returns A new array; linear in the number of items.
 */
export function visibleItems(
  items: readonly PlanItem[],
  visible: Box,
  keep: ItemId | null = null,
): PlanItem[] {
  return items.filter((item) => item.id === keep || boxesIntersect(cachedBounds(item), visible));
}

/**
 * Viewport that fits every item. An empty plan is shown at 100% with the world
 * origin in the middle, so the first item added lands in view.
 */
export function fitItems(items: readonly PlanItem[], size: Size, padding = 32): Viewport {
  const bounds = unionOf(items.map(cachedBounds));
  if (!bounds || size.width === 0) {
    return { ...IDENTITY_VIEWPORT, offsetX: size.width / 2, offsetY: size.height / 2 };
  }
  return fitBox(bounds, size, padding);
}
