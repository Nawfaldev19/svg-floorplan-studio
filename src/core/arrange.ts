/**
 * Arranging a selection: align to an edge or centre line, distribute with
 * equal gaps, and rotate several items as one rigid shape. Align and
 * distribute use the rotated bounds, so results match what is drawn.
 *
 * @packageDocumentation
 */
import { boundsOf, normalizeDegrees, rotateAbout, unionOf, type Box } from './geometry';
import type { PlanItem } from './types';

/** Which edge or centre line {@link alignItems} lines items up on. */
export type AlignEdge = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

/** The axis along which {@link distributeItems} equalises gaps. */
export type DistributeAxis = 'horizontal' | 'vertical';

/** The coordinate of `edge` on a box. */
function edgeOf(box: Box, edge: AlignEdge): number {
  switch (edge) {
    case 'left':
      return box.minX;
    case 'right':
      return box.maxX;
    case 'centerX':
      return (box.minX + box.maxX) / 2;
    case 'top':
      return box.minY;
    case 'bottom':
      return box.maxY;
    case 'centerY':
      return (box.minY + box.maxY) / 2;
  }
}

const HORIZONTAL_EDGES: readonly AlignEdge[] = ['left', 'centerX', 'right'];

/**
 * Lines up items on one edge of the selection's overall bounds. Uses each
 * item's rotated bounding box, so a turned desk aligns by what you see.
 *
 * @returns Moved copies in the input order; fewer than two items are returned unchanged.
 * @example
 * ```ts
 * alignItems([a, b], 'left'); // both now share the leftmost left edge
 * ```
 */
export function alignItems(items: readonly PlanItem[], edge: AlignEdge): PlanItem[] {
  const target = unionOf(items.map(boundsOf));
  if (!target || items.length < 2) return [...items];
  const goal = edgeOf(target, edge);
  const horizontal = HORIZONTAL_EDGES.includes(edge);
  return items.map((item) => {
    const shift = goal - edgeOf(boundsOf(item), edge);
    return horizontal ? { ...item, x: item.x + shift } : { ...item, y: item.y + shift };
  });
}

/**
 * Spaces items so the gaps between neighbouring bounding boxes are equal. The
 * outermost items stay where they are. Needs at least three items.
 */
export function distributeItems(items: readonly PlanItem[], axis: DistributeAxis): PlanItem[] {
  if (items.length < 3) return [...items];
  const horizontal = axis === 'horizontal';
  const measured = items.map((item) => {
    const box = boundsOf(item);
    return {
      item,
      start: horizontal ? box.minX : box.minY,
      size: horizontal ? box.maxX - box.minX : box.maxY - box.minY,
    };
  });
  const sorted = [...measured].sort((a, b) => a.start - b.start);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return [...items];
  const span = last.start + last.size - first.start;
  const occupied = sorted.reduce((sum, m) => sum + m.size, 0);
  const gap = (span - occupied) / (sorted.length - 1);

  const moved = new Map<string, PlanItem>();
  let cursor = first.start;
  for (const m of sorted) {
    const shift = cursor - m.start;
    moved.set(
      m.item.id,
      horizontal ? { ...m.item, x: m.item.x + shift } : { ...m.item, y: m.item.y + shift },
    );
    cursor += m.size + gap;
  }
  return items.map((item) => moved.get(item.id) ?? item);
}

/**
 * Turns the items as one rigid shape about the mean of their centres, so a
 * desk pod keeps its layout. A single item turns about its own centre.
 *
 * @remarks
 * The mean of the centres turns with the shape, so it is the same point
 * before and after every turn. That makes repeated turns exact: `+θ` followed
 * by `−θ` restores the layout, and 24 turns of 15° come back to the start. The
 * centre of the rotated bounds would move with each turn of an uneven
 * selection and drift.
 *
 * @param degrees - Clockwise angle; negative turns anticlockwise.
 * @example
 * ```ts
 * rotateItemsBy(rotateItemsBy(items, 15), -15); // the original layout, to rounding
 * ```
 * @see docs/adr/0011-multi-selection-rotates-about-its-centre.md
 */
export function rotateItemsBy(items: readonly PlanItem[], degrees: number): PlanItem[] {
  if (items.length === 0) return [];
  const pivot = {
    x: items.reduce((sum, item) => sum + item.x, 0) / items.length,
    y: items.reduce((sum, item) => sum + item.y, 0) / items.length,
  };
  return items.map((item) => ({
    ...item,
    ...rotateAbout(item, pivot, degrees),
    rotation: normalizeDegrees(item.rotation + degrees),
  }));
}
