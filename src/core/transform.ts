/**
 * Item transforms for gestures: move with grid snapping, resize from any of
 * eight handles with the opposite side fixed, rotate from the knob, and the
 * clamp that keeps every result inside the file format.
 *
 * @see docs/explanation/geometry-and-history.md
 * @packageDocumentation
 */
import { KIND_SPECS } from './catalog';
import { normalizeDegrees, snapTo, toLocal, toWorld, type Point } from './geometry';
import { clampCoordinate, MAX_COORDINATE } from './limits';
import type { PlanItem } from './types';

/** The eight resize handles, clockwise from the top-left corner. */
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
/** One of {@link HANDLES}, named by compass direction in the item's own frame. */
export type Handle = (typeof HANDLES)[number];

/** Unit direction of each handle in the item's local frame. */
export const HANDLE_DIRECTION: Readonly<Record<Handle, Point>> = {
  nw: { x: -1, y: -1 },
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
};

const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'] as const;

/**
 * The resize cursor for a handle on an item turned by `rotation` degrees. The
 * handle's on-screen direction is snapped to the nearest 45°, so the arrows
 * follow the item instead of assuming it is upright.
 */
export function handleCursor(handle: Handle, rotation: number): string {
  const dir = HANDLE_DIRECTION[handle];
  const degrees = (Math.atan2(dir.y, dir.x) * 180) / Math.PI + rotation;
  const octant = Math.round(normalizeDegrees(degrees) / 45) % 4;
  return RESIZE_CURSORS[octant] ?? 'move';
}

/** Type guard for a `data-handle` attribute value. */
export function isHandle(value: string | null): value is Handle {
  return value !== null && (HANDLES as readonly string[]).includes(value);
}

/**
 * Moves every item by the same delta. With snapping, the delta is chosen so the
 * grabbed `anchor` item lands on the grid; the rest keep their relative offsets.
 *
 * @param snapStep - Grid step in centimetres, or null to move freely (Alt held).
 * @example
 * ```ts
 * moveItems([desk], desk, { x: 13, y: 0 }, 10); // desk.x + 10 when desk.x is on the grid
 * ```
 */
export function moveItems(
  items: readonly PlanItem[],
  anchor: PlanItem,
  delta: Point,
  snapStep: number | null,
): PlanItem[] {
  const dx = snapStep ? snapTo(anchor.x + delta.x, snapStep) - anchor.x : delta.x;
  const dy = snapStep ? snapTo(anchor.y + delta.y, snapStep) - anchor.y : delta.y;
  return items.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy }));
}

/** Modifiers that change how {@link resizeItem} behaves. */
export interface ResizeOptions {
  /** Keep the width-to-height ratio (Shift held). */
  readonly keepAspect: boolean;
  /** Grid step for the new size in centimetres, or null for none (Alt held). */
  readonly snapStep: number | null;
}

/**
 * Resizes from a handle. The opposite corner (or edge) stays fixed in world
 * space even when the item is rotated, because the maths happens in the
 * item's local frame and only the new centre is mapped back to world.
 *
 * @param pointer - The pointer position in world centimetres.
 * @returns A new item, never smaller than its kind's minimum size.
 * @see docs/explanation/geometry-and-history.md
 */
export function resizeItem(
  item: PlanItem,
  handle: Handle,
  pointer: Point,
  options: ResizeOptions,
): PlanItem {
  const dir = HANDLE_DIRECTION[handle];
  const min = KIND_SPECS[item.kind].minSize;
  const local = toLocal(item, pointer);
  const fixed = { x: (-dir.x * item.width) / 2, y: (-dir.y * item.height) / 2 };

  const step = options.snapStep;
  const fit = (raw: number, minimum: number) => Math.max(minimum, step ? snapTo(raw, step) : raw);

  let width = dir.x === 0 ? item.width : fit(dir.x * (local.x - fixed.x), min.width);
  let height = dir.y === 0 ? item.height : fit(dir.y * (local.y - fixed.y), min.height);

  if (options.keepAspect) {
    const ratio = item.width / item.height;
    if (dir.x !== 0 && dir.y !== 0) {
      const scale = Math.max(width / item.width, height / item.height);
      width = Math.max(min.width, item.width * scale);
      height = Math.max(min.height, width / ratio);
      width = height * ratio;
    } else if (dir.x !== 0) {
      height = Math.max(min.height, width / ratio);
      width = height * ratio;
    } else {
      width = Math.max(min.width, height * ratio);
      height = width / ratio;
    }
  }

  const centerLocal = {
    x: dir.x === 0 ? 0 : fixed.x + (dir.x * width) / 2,
    y: dir.y === 0 ? 0 : fixed.y + (dir.y * height) / 2,
  };
  const center = toWorld(item, centerLocal);
  return { ...item, x: center.x, y: center.y, width, height };
}

/**
 * Rotation from the pointer's angle around the item centre. The rotate knob
 * sits above the item, so "pointer straight up" means 0 degrees.
 *
 * @param snapDegrees - Snap increment (15 with Shift held), or null.
 */
export function rotateItem(item: PlanItem, pointer: Point, snapDegrees: number | null): PlanItem {
  const radians = Math.atan2(pointer.y - item.y, pointer.x - item.x);
  const raw = normalizeDegrees((radians * 180) / Math.PI + 90);
  const rotation = snapDegrees ? normalizeDegrees(snapTo(raw, snapDegrees)) : raw;
  return { ...item, rotation };
}

/**
 * Clamps any geometry edit to the kind's minimum size and to the bounds of the
 * file format, so an edit can never produce a plan the importer would reject.
 */
export function sanitizeGeometry(item: PlanItem): PlanItem {
  const min = KIND_SPECS[item.kind].minSize;
  return {
    ...item,
    x: clampCoordinate(item.x),
    y: clampCoordinate(item.y),
    width: Math.min(MAX_COORDINATE, Math.max(min.width, item.width)),
    height: Math.min(MAX_COORDINATE, Math.max(min.height, item.height)),
    rotation: normalizeDegrees(item.rotation),
  };
}
