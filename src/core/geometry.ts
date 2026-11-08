/**
 * 2D geometry in world units (centimetres): local and world frames, rotated
 * bounds, exact hit tests and snapping. Pure functions only.
 *
 * @see docs/explanation/geometry-and-history.md
 * @packageDocumentation
 */
import { KIND_SPECS } from './catalog';
import type { PlanItem } from './types';

/** A point or vector. Which frame it is in (screen, world, item-local) depends on the caller. */
export interface Point {
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate; down is positive. */
  readonly y: number;
}

/** Axis-aligned box in world units. */
export interface Box {
  /** Left edge. */
  readonly minX: number;
  /** Top edge. */
  readonly minY: number;
  /** Right edge. */
  readonly maxX: number;
  /** Bottom edge. */
  readonly maxY: number;
}

type Placement = Pick<PlanItem, 'x' | 'y' | 'width' | 'height' | 'rotation'>;

const DEG = Math.PI / 180;

/**
 * Wraps any angle into `[0, 360)`.
 *
 * @example
 * ```ts
 * normalizeDegrees(-90); // 270
 * normalizeDegrees(720); // 0
 * ```
 */
export function normalizeDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  const positive = wrapped < 0 ? wrapped + 360 : wrapped;
  // Avoid returning -0 or exactly 360 after floating-point wrap.
  return positive === 360 || Object.is(positive, -0) ? 0 : positive;
}

function rotateVector(p: Point, degrees: number): Point {
  const cos = Math.cos(degrees * DEG);
  const sin = Math.sin(degrees * DEG);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Turns `point` clockwise by `degrees` around `pivot`. */
export function rotateAbout(point: Point, pivot: Point, degrees: number): Point {
  const r = rotateVector({ x: point.x - pivot.x, y: point.y - pivot.y }, degrees);
  return { x: r.x + pivot.x, y: r.y + pivot.y };
}

/** Converts a world point into the item's local frame (origin at centre, unrotated). */
export function toLocal(item: Placement, world: Point): Point {
  return rotateVector({ x: world.x - item.x, y: world.y - item.y }, -item.rotation);
}

/** Converts a point in the item's local frame back to world coordinates. */
export function toWorld(item: Placement, local: Point): Point {
  const r = rotateVector(local, item.rotation);
  return { x: r.x + item.x, y: r.y + item.y };
}

/** World-space corners in clockwise order starting at the local top-left. */
export function cornersOf(item: Placement): readonly [Point, Point, Point, Point] {
  const hw = item.width / 2;
  const hh = item.height / 2;
  return [
    toWorld(item, { x: -hw, y: -hh }),
    toWorld(item, { x: hw, y: -hh }),
    toWorld(item, { x: hw, y: hh }),
    toWorld(item, { x: -hw, y: hh }),
  ];
}

/** The smallest box containing every point. An empty list gives an inverted (infinite) box. */
export function boxFromPoints(points: readonly Point[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Axis-aligned bounding box of the item after rotation. */
export function boundsOf(item: Placement): Box {
  return boxFromPoints(cornersOf(item));
}

/**
 * The smallest box containing every box.
 *
 * @returns Null for an empty list, so callers cannot mistake "nothing" for a box at the origin.
 */
export function unionOf(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((acc, b) => ({
    minX: Math.min(acc.minX, b.minX),
    minY: Math.min(acc.minY, b.minY),
    maxX: Math.max(acc.maxX, b.maxX),
    maxY: Math.max(acc.maxY, b.maxY),
  }));
}

/** Whether `inner` lies entirely inside `outer` (edges may touch). Used by the marquee. */
export function boxContainsBox(outer: Box, inner: Box): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

/** Whether two boxes overlap or touch. Used by viewport culling. */
export function boxesIntersect(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Exact hit test in the item's local frame, so rotated shapes behave.
 * `tolerance` (world units) widens the shape, which keeps thin walls clickable.
 *
 * @remarks
 * Ellipses use the ellipse equation, so a point inside the bounding box but
 * outside the curve misses.
 *
 * @example
 * ```ts
 * itemContainsPoint(desk, { x: desk.x, y: desk.y }); // true
 * ```
 */
export function itemContainsPoint(item: PlanItem, world: Point, tolerance = 0): boolean {
  const local = toLocal(item, world);
  const hw = item.width / 2 + tolerance;
  const hh = item.height / 2 + tolerance;
  if (KIND_SPECS[item.kind].shape === 'ellipse') {
    return (local.x / hw) ** 2 + (local.y / hh) ** 2 <= 1;
  }
  return Math.abs(local.x) <= hw && Math.abs(local.y) <= hh;
}

/**
 * Rounds `value` to the nearest multiple of `step`; a non-positive step leaves it unchanged.
 *
 * @example
 * ```ts
 * snapTo(127, 10); // 130
 * ```
 */
export function snapTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
