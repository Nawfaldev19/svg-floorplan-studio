/**
 * Camera maths: the mapping between world centimetres and screen pixels, zoom
 * about a point, fitting and the visible area. Kept out of the document and
 * the history, because zooming is not an edit.
 *
 * @packageDocumentation
 */
import type { Box, Point } from './geometry';

/**
 * Maps world (cm) to screen (CSS px): screen = world * scale + offset.
 * Kept separate from the document because zoom and pan are not undoable.
 */
export interface Viewport {
  /** Screen x of the world origin, in CSS pixels. */
  readonly offsetX: number;
  /** Screen y of the world origin, in CSS pixels. */
  readonly offsetY: number;
  /** CSS pixels per centimetre, within [{@link MIN_SCALE}, {@link MAX_SCALE}]. */
  readonly scale: number;
}

/** Width and height of an element, in CSS pixels. */
export interface Size {
  /** Width in CSS pixels. */
  readonly width: number;
  /** Height in CSS pixels. */
  readonly height: number;
}

/** Furthest zoom out: 0.1 px per cm. */
export const MIN_SCALE = 0.1;
/** Furthest zoom in: 8 px per cm. */
export const MAX_SCALE = 8;

/** 100% zoom with the world origin at the screen's top-left corner. */
export const IDENTITY_VIEWPORT: Viewport = { offsetX: 0, offsetY: 0, scale: 1 };

/** Keeps a zoom level within [{@link MIN_SCALE}, {@link MAX_SCALE}]. */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Converts a screen point (CSS px relative to the canvas) to world centimetres. */
export function screenToWorld(vp: Viewport, screen: Point): Point {
  return { x: (screen.x - vp.offsetX) / vp.scale, y: (screen.y - vp.offsetY) / vp.scale };
}

/** Converts world centimetres to a screen point; the inverse of {@link screenToWorld}. */
export function worldToScreen(vp: Viewport, world: Point): Point {
  return { x: world.x * vp.scale + vp.offsetX, y: world.y * vp.scale + vp.offsetY };
}

/**
 * Zooms by `factor` while keeping the world point under `anchor` fixed on screen.
 *
 * @remarks
 * Solves `anchor = world * scale + offset` for the new offset after clamping
 * the scale, so the anchor holds even at the zoom limits.
 *
 * @example
 * ```ts
 * const next = zoomAt(vp, pointer, 1.25);
 * // screenToWorld(next, pointer) equals screenToWorld(vp, pointer)
 * ```
 */
export function zoomAt(vp: Viewport, anchor: Point, factor: number): Viewport {
  const scale = clampScale(vp.scale * factor);
  const world = screenToWorld(vp, anchor);
  return { scale, offsetX: anchor.x - world.x * scale, offsetY: anchor.y - world.y * scale };
}

/** Moves the view by a screen distance in CSS pixels. */
export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, offsetX: vp.offsetX + dx, offsetY: vp.offsetY + dy };
}

/** Viewport that shows `box` centred inside `size`, leaving `padding` px on every side. */
export function fitBox(box: Box, size: Size, padding = 32): Viewport {
  const boxW = Math.max(box.maxX - box.minX, 1);
  const boxH = Math.max(box.maxY - box.minY, 1);
  const availW = Math.max(size.width - padding * 2, 1);
  const availH = Math.max(size.height - padding * 2, 1);
  const scale = clampScale(Math.min(availW / boxW, availH / boxH));
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return { scale, offsetX: size.width / 2 - cx * scale, offsetY: size.height / 2 - cy * scale };
}

/** World-space box currently visible, grown by `marginPx` so items pop in before the edge. */
export function visibleWorldBox(vp: Viewport, size: Size, marginPx = 64): Box {
  const topLeft = screenToWorld(vp, { x: -marginPx, y: -marginPx });
  const bottomRight = screenToWorld(vp, { x: size.width + marginPx, y: size.height + marginPx });
  return { minX: topLeft.x, minY: topLeft.y, maxX: bottomRight.x, maxY: bottomRight.y };
}

/**
 * The camera after two fingers move from `from` to `to`: it pans with their
 * midpoint and zooms about it by the change in their distance, so the world
 * points under both fingers stay under them.
 *
 * @param from - The two touch points at the previous sample, in screen pixels.
 * @param to - The same two points now.
 * @example
 * ```ts
 * // Fingers spread from 100 px to 200 px apart around the same midpoint: zoom in 2×.
 * pinchViewport(vp, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: -50, y: 0 }, { x: 150, y: 0 }]);
 * ```
 */
export function pinchViewport(
  vp: Viewport,
  from: readonly [Point, Point],
  to: readonly [Point, Point],
): Viewport {
  const mid = (p: readonly [Point, Point]) => ({
    x: (p[0].x + p[1].x) / 2,
    y: (p[0].y + p[1].y) / 2,
  });
  const span = (p: readonly [Point, Point]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  const before = mid(from);
  const after = mid(to);
  const factor = span(from) > 0 ? span(to) / span(from) : 1;
  return zoomAt(panBy(vp, after.x - before.x, after.y - before.y), after, factor);
}
